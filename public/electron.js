const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const JSZip = require('jszip');
const NodeID3 = require('node-id3');
const axios = require('axios');
const { create: createYoutubeDl } = require('youtube-dl-exec');
const { searchRecording } = require(path.join(__dirname, '../src/services/musicbrainzService'));

// When the app is packaged, native binaries are extracted to app.asar.unpacked/.
// We must rewrite the path so the OS can actually execute them.
function fixAsarPath(p) {
  if (app.isPackaged) {
    return p.replace('app.asar', 'app.asar.unpacked');
  }
  return p;
}

const ffmpegPath = fixAsarPath(ffmpegStatic);
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

// Resolve the yt-dlp binary that ships with youtube-dl-exec
const ytdlpBinary = fixAsarPath(
  path.join(
    path.dirname(require.resolve('youtube-dl-exec/package.json')),
    'bin',
    process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  )
);
const youtubedl = createYoutubeDl(ytdlpBinary);

// --- Rate-limited queue for yt-dlp calls ---
// Serializes all yt-dlp invocations and enforces a minimum delay between them
// to avoid triggering YouTube's bot detection.
const YTDLP_DELAY_MS = 2000;

class RateLimitedQueue {
  constructor(delayMs) {
    this.delayMs = delayMs;
    this.running = false;
    this.queue = [];
    this.lastFinishTime = 0;
  }

  run(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this._next();
    });
  }

  async _next() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    const { fn, resolve, reject } = this.queue.shift();

    const wait = this.delayMs - (Date.now() - this.lastFinishTime);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));

    try {
      resolve(await fn());
    } catch (err) {
      reject(err);
    } finally {
      this.lastFinishTime = Date.now();
      this.running = false;
      this._next();
    }
  }
}

const ytdlpQueue = new RateLimitedQueue(YTDLP_DELAY_MS);

// --- Cookie-aware yt-dlp wrapper ---
// Tries browsers in order to pass cookies; caches the first working one.
const BROWSER_ORDER = process.platform === 'win32'
  ? ['chrome', 'edge', 'firefox']
  : process.platform === 'darwin'
  ? ['chrome', 'firefox']
  : ['chrome', 'firefox'];

// undefined = not yet resolved; false = no browser found; string = browser name
let cachedBrowser = undefined;

function isBrowserNotFoundError(err) {
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('could not find') ||
    msg.includes('no such browser') ||
    msg.includes('browser not found') ||
    msg.includes('unsupported browser')
  );
}

async function youtubedlWithCookies(url, options) {
  if (cachedBrowser !== undefined) {
    const opts = cachedBrowser
      ? { ...options, cookiesFromBrowser: cachedBrowser }
      : options;
    return youtubedl(url, opts);
  }

  for (const browser of BROWSER_ORDER) {
    try {
      const result = await youtubedl(url, { ...options, cookiesFromBrowser: browser });
      cachedBrowser = browser;
      console.log(`[yt-dlp] Using ${browser} cookies`);
      return result;
    } catch (err) {
      if (isBrowserNotFoundError(err)) {
        console.log(`[yt-dlp] Browser ${browser} not found, trying next...`);
        continue;
      }
      // Browser IS available but the request failed for another reason — cache and propagate
      cachedBrowser = browser;
      throw err;
    }
  }

  console.log('[yt-dlp] No browser found for cookies, proceeding without');
  cachedBrowser = false;
  return youtubedl(url, options);
}

let mainWindow;
const isDev = process.env.ELECTRON_IS_DEV === '1';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev
    },
    show: false,
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
const downloadsDir = path.join(app.getPath('downloads'), 'youtube-music-converter');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

const tempDir = path.join(app.getPath('temp'), 'youtube-music-converter');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Validate YouTube URL
ipcMain.handle('validate-url', async (event, { url, index, total }) => {
  console.log(`Validating URL ${index + 1}/${total}:`, url);

  const win = BrowserWindow.getFocusedWindow();

  // Notify the UI that this URL is now being checked (before queue wait)
  if (win) {
    win.webContents.send('validation-progress', {
      total,
      status: `Checking URL ${index + 1} of ${total}...`,
      currentUrl: url,
    });
  }

  const sendResult = (current, status, title = '', author = '') => {
    if (win) {
      win.webContents.send('validation-progress', { current, total, status, currentUrl: url, currentTitle: title, currentAuthor: author });
    }
  };

  try {
    if (!url || !url.includes('youtube.com/watch')) {
      console.log('Invalid YouTube URL format');
      sendResult(index + 1, `Skipped URL ${index + 1} of ${total}: invalid format`);
      return { valid: false, error: 'Please enter a valid YouTube URL' };
    }

    console.log('Fetching video info with youtube-dl-exec...');
    try {
      const info = await ytdlpQueue.run(() => youtubedlWithCookies(url, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true,
        referer: url
      }));
      
      if (!info) {
        console.log('No video details found');
        sendResult(index + 1, `Failed to fetch URL ${index + 1} of ${total}`);
        return { valid: false, error: 'Could not fetch video information' };
      }

      const title = info.title || 'Unknown Title';
      const author = info.uploader || 'Unknown Author';

      console.log('Successfully fetched video info');
      sendResult(index + 1, `Validating ${index + 1} of ${total}`, title, author);
      return {
        valid: true,
        title,
        author,
        thumbnail: info.thumbnail || '',
        duration: info.duration || 0,
      };
    } catch (error) {
      console.error('Error fetching video info:', error);
      sendResult(index + 1, `Error on URL ${index + 1} of ${total}`);
      return { 
        valid: false, 
        error: `Failed to fetch video info: ${error.message}`
      };
    }
  } catch (error) {
    console.error('Unexpected error in validate-url:', error);
    return { 
      valid: false, 
      error: `An unexpected error occurred: ${error.message}` 
    };
  }
});

// Download and convert video
ipcMain.handle('download-video', async (event, { url, index, total, cachedInfo }) => {
  const videoId = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1] || 'video';
  const outputPath = path.join(tempDir, `${videoId}.mp3`);
  
  try {
    let title, author, thumbnailUrl;

    if (cachedInfo) {
      // Reuse metadata already fetched during the validation step
      title = cachedInfo.title;
      author = cachedInfo.author;
      thumbnailUrl = cachedInfo.thumbnail;
    } else {
      const info = await ytdlpQueue.run(() => youtubedlWithCookies(url, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificate: true
      }));

      if (!info) {
        throw new Error('Could not fetch video information');
      }

      title = info.title || 'Unknown Title';
      author = info.uploader || 'Unknown Author';
      thumbnailUrl = info.thumbnail || '';
    }
    
    // Download thumbnail
    let thumbnailBuffer = null;
    if (thumbnailUrl) {
      try {
        const response = await axios.get(thumbnailUrl, { 
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        thumbnailBuffer = Buffer.from(response.data);
      } catch (err) {
        console.error('Failed to download thumbnail:', err);
      }
    }
    
    console.log(`Starting download of ${url} to ${outputPath}`);
    
    // Download and convert the video
    await ytdlpQueue.run(() => youtubedlWithCookies(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: outputPath,
      noWarnings: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      ffmpegLocation: ffmpegPath,
      referer: url,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
    }));
    
    // Add metadata
    if (fs.existsSync(outputPath)) {
      try {
        // Basic metadata from YouTube
        const tags = {
          title: title,
          artist: author,
          album: 'YouTube Downloads',
          comment: `Downloaded from YouTube: ${url}`,
          year: new Date().getFullYear().toString(),
          genre: 'YouTube',
          composer: '',
          trackNumber: '1',
          totalTracks: '1',
          albumArtist: author
        };

        // Try to get enhanced metadata from MusicBrainz
        try {
          const mbMetadata = await searchRecording(author, title);
          if (mbMetadata) {
            // Update tags with MusicBrainz metadata if available
            Object.assign(tags, {
              title: mbMetadata.title || title,
              artist: mbMetadata.artist || author,
              album: mbMetadata.album || 'YouTube Downloads',
              year: mbMetadata.year || new Date().getFullYear().toString(),
              genre: mbMetadata.genre || 'YouTube',
              composer: mbMetadata.composer || '',
              trackNumber: mbMetadata.trackNumber || '1',
              totalTracks: mbMetadata.totalTracks || '1',
              albumArtist: mbMetadata.albumArtist || author,
              comment: `Downloaded from YouTube: ${url}`,
              recordingId: mbMetadata.recordingId || '',
              releaseId: mbMetadata.releaseId || ''
            });
          }
        } catch (mbError) {
          console.error('Error fetching MusicBrainz metadata:', mbError);
          // Continue with basic metadata if MusicBrainz fails
        }
        
        // Add thumbnail if available
        if (thumbnailBuffer) {
          tags.image = {
            mime: 'image/jpeg',
            type: { id: 3 },
            description: 'Cover',
            imageBuffer: thumbnailBuffer,
          };
        }
        
        // Write all metadata to the file
        NodeID3.write(tags, outputPath);
        
        console.log('Metadata written successfully:', {
          title: tags.title,
          artist: tags.artist,
          album: tags.album,
          year: tags.year
        });
      } catch (err) {
        console.error('Failed to write metadata:', err);
      }
    } else {
      throw new Error('Failed to create output file');
    }
    
    event.sender.send('video-progress', { index, progress: 100 });
    
    return {
      success: true,
      path: outputPath,
      title,
      author,
      index,
    };
    
  } catch (error) {
    console.error('Download error:', error);
    return {
      success: false,
      error: error.message || 'Failed to download video',
      index,
    };
  }
});

// Create ZIP file
ipcMain.handle('create-zip', async (event, files) => {
  try {
    const zip = new JSZip();
    
    for (const file of files) {
      if (file.success && fs.existsSync(file.path)) {
        const fileData = fs.readFileSync(file.path);
        const safeTitle = file.title.replace(/[<>:"/\\|?*]/g, '_');
        zip.file(`${safeTitle}.mp3`, fileData);
      }
    }
    
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipPath = path.join(downloadsDir, `youtube-music-${Date.now()}.zip`);
    fs.writeFileSync(zipPath, zipBuffer);
    
    // Clean up temp files
    for (const file of files) {
      if (file.success && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
    
    return { success: true, path: zipPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Clean up temp directory
ipcMain.handle('cleanup', async () => {
  try {
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Show save dialog
ipcMain.handle('show-save-dialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save ZIP file',
    defaultPath: path.join(downloadsDir, `youtube-music-${Date.now()}.zip`),
    filters: [{ name: 'ZIP Files', extensions: ['zip'] }],
  });
  return result;
});

// Show file in folder
ipcMain.handle('show-item-in-folder', async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

