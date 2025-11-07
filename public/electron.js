const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const JSZip = require('jszip');
const NodeID3 = require('node-id3');
const axios = require('axios');
const youtubedl = require('youtube-dl-exec');

// Set ffmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
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
      preload: isDev 
        ? path.join(__dirname, 'preload.js')
        : path.join(process.resourcesPath, 'preload.js'),
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
ipcMain.handle('validate-url', async (event, url) => {
  console.log('Validating URL:', url);
  
  try {
    // Basic URL validation
    if (!url || !url.includes('youtube.com/watch')) {
      console.log('Invalid YouTube URL format');
      return { valid: false, error: 'Please enter a valid YouTube URL' };
    }

    console.log('Fetching video info with youtube-dl-exec...');
    try {
      const info = await youtubedl(url, {
        dumpSingleJson: true,
        noWarnings: true,
        noCallHome: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true,
        referer: url
      });
      
      if (!info) {
        console.log('No video details found');
        return { valid: false, error: 'Could not fetch video information' };
      }
      
      console.log('Successfully fetched video info');
      return {
        valid: true,
        title: info.title || 'Unknown Title',
        author: info.uploader || 'Unknown Author',
        thumbnail: info.thumbnail || '',
        duration: info.duration || 0,
      };
    } catch (error) {
      console.error('Error fetching video info:', error);
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
ipcMain.handle('download-video', async (event, { url, index, total }) => {
  const videoId = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1] || 'video';
  const outputPath = path.join(tempDir, `${videoId}.mp3`);
  
  try {
    // Get video info first
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true
    });
    
    if (!info) {
      throw new Error('Could not fetch video information');
    }
    
    const title = info.title || 'Unknown Title';
    const author = info.uploader || 'Unknown Author';
    const thumbnailUrl = info.thumbnail || '';
    
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
    await youtubedl(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: outputPath,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      referer: url,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
    });
    
    // Add metadata
    if (fs.existsSync(outputPath)) {
      try {
        const tags = {
          title: title,
          artist: author,
          album: 'YouTube Downloads',
        };
        
        if (thumbnailBuffer) {
          tags.image = {
            mime: 'image/jpeg',
            type: { id: 3 },
            description: 'Cover',
            imageBuffer: thumbnailBuffer,
          };
        }
        
        NodeID3.write(tags, outputPath);
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

