# Release Notes

## v0.6.4 — April 29, 2026

### What's New in v0.6.4

#### 🐛 Bug Fixes

- **Fixed screen flicker when opening the file picker (Windows) — for real this time** — v0.6.2 masked the flicker by matching `BrowserWindow`'s `backgroundColor` to the app's content background (`#f5f5f5`). v0.6.3 then changed `backgroundColor` to `#667eea` (to fix the startup flash), which re-introduced a visible purple flash every time the file picker opened. The root cause — attaching the OS dialog to `mainWindow` as its Win32 owner — was never actually fixed. When an owned dialog opens, Windows sends `WM_NCACTIVATE(FALSE)` to the parent, causing Chromium to briefly repaint with `backgroundColor`. Removing `mainWindow` as the dialog owner eliminates the deactivation event entirely, so no repaint occurs regardless of `backgroundColor`.

- **Fixed all downloads failing instantly on Windows** — Downloads were passing `--ffmpeg-location` unconditionally to `yt-dlp`, pointing at the `ffmpeg-static` binary resolved at startup. If that binary is missing, not executable, or resolves incorrectly in the packaged Windows build, `yt-dlp` fails immediately when it tries to post-process audio — before writing any output file. Crucially, this error was not recognised as a recoverable "infrastructure" failure, so `youtubedlWithCookies` cached the browser and re-threw, causing every subsequent download in the session to fail the same way with no retry. Two fixes address this:
  1. `--ffmpeg-location` is now guarded by `fs.existsSync` and only passed when the binary is actually present on disk; otherwise `yt-dlp` falls back to whatever `ffmpeg` is on `PATH`.
  2. A new `isInfrastructureError()` helper widens the fast-path catch to include ffmpeg, spawn, and permission errors (in addition to cookie errors), so these failures reset `cachedBrowser` and trigger the full discovery loop rather than propagating silently.

#### 🔧 Diagnostics

- **Startup warning if ffmpeg binary is missing** — On launch, the app now logs a `[startup]` warning if the resolved `ffmpeg-static` path does not exist on disk, making packaging issues immediately visible in Electron logs without needing to reproduce a failed download.
- **Detailed download error logging** — The download catch block now logs the full `yt-dlp` stderr (`error.message`) under a `[download]` prefix, so the exact failure reason is visible without having to attach a debugger.

---

## v0.6.3 — April 28, 2026

### What's New in v0.6.3

#### 🐛 Bug Fixes

- **Fixed white screen flicker on app startup (Windows)** — Three compounding causes addressed:
  1. The `BrowserWindow` `backgroundColor` was `#f5f5f5` (grey), mismatching the splash screen's purple gradient. The native window now uses `#667eea` (the gradient's start colour), so even the brief moment before React loads is visually seamless.
  2. `index.html` had no body background colour — before `index.css` was parsed the page was white. An inline `<style>` now sets `body { background-color: #667eea }` as an immediate fallback.
  3. The `SplashScreen → MainApp` switch was an abrupt React unmount/mount: the full-viewport purple gradient disappeared instantly, revealing a grey container before its header gradient painted. The transition is now a CSS `opacity` cross-fade — SplashScreen begins fading at 1.5 s and completes at 2 s, during which MainApp is already rendered behind it (invisible, `pointer-events: none`) and fades in simultaneously.

- **Fixed downloads still failing on Windows after v0.6.2** — v0.6.2 added cookie-error recovery in the browser *discovery loop* (when `cachedBrowser` is `undefined`) but the *fast path* (when a browser is already cached) had no error handling at all. If Chrome opened between the URL validation phase and the download phase — acquiring an exclusive lock on its SQLite cookie database — every download call hit the fast path, received `"database is locked"`, and threw directly with no fallback. The fast path now wraps the `youtubedl()` call in a `try/catch`; on any cookie or browser error it resets `cachedBrowser = undefined` and re-runs the full discovery loop, eventually falling back to no-cookie mode so downloads of public videos still succeed.

---

## v0.6.2 — April 28, 2026

### What's New in v0.6.2

#### 🐛 Bug Fixes

- **Fixed screen flicker on Windows when opening the file picker** — Clicking "Browse Files" previously caused the app window to flash white one or more times. The root cause was a hidden `<input type="file">` being clicked programmatically, which forces Chromium to briefly lose focus when the OS dialog opens. The file picker is now implemented using Electron's native `dialog.showOpenDialog` via IPC, which avoids the focus-loss cycle entirely. A `backgroundColor` matching the app's background (`#f5f5f5`) is also now set on the `BrowserWindow` so any residual repaint is invisible rather than white.

- **Fixed downloads failing on every video on Windows** — When Chrome (or another browser) is installed but its cookie database cannot be read — for example because Chrome is already running and holds an exclusive lock on its SQLite file, or because Windows DPAPI decryption fails — `yt-dlp` raised an error that the app did not recognise as a recoverable one. The code was caching the broken browser as the active source and re-throwing the error, causing every single download in the session to fail. A new `isCookieExtractionError()` check now detects these Windows-specific failures (`"database is locked"`, `"unable to decrypt"`, `"CryptUnprotectData"`, etc.) and falls through to the next browser in the priority order (`chrome → edge → firefox`). If all browsers fail for cookie-related reasons, the app proceeds without cookies — downloads can still succeed for public videos.

#### 🔧 Internal / Packaging

- **Windows build now produces only the NSIS installer** — The build previously generated two separate EXE files: an NSIS installer and a portable standalone EXE. Both ran the identical Electron application at runtime, so there was no performance difference between them. The NSIS installer provides a marginally faster startup (binaries are permanently extracted to the installation directory) and offers a proper uninstaller and Start Menu shortcuts. The `portable` target has been removed from `package.json`; the Windows build now outputs a single NSIS installer EXE.

---

## v0.6.1 — April 28, 2026

### What's New in v0.6.1

#### 🎵 Enhanced MP3 Metadata Accuracy
- **Deezer as primary metadata source** — The app now queries the free Deezer search API (no authentication required) before falling back to MusicBrainz. Deezer returns clean, structured data — title, artist, album, duration, and cover art — in a single API call, with much better coverage for mainstream music.
- **Deezer cover art** — When a Deezer match is found, the album cover image (250×250) is embedded in the MP3 instead of the YouTube video thumbnail. MIME type is detected from the HTTP response headers rather than assumed.
- **Multi-candidate scoring engine** (`metadataScorer.js`) — All metadata sources now fetch up to 5 candidates and rank them using a weighted score: track title similarity (50%), artist similarity (35%), and duration delta (15%). The best candidate is accepted only if its overall score ≥ 0.65 **and** its title similarity ≥ 0.40, preventing mismatches.
- **Fixed `extractArtistAndTrack` bug** — The previous implementation stripped everything after `-` from the title *before* running pattern matching, meaning `"Dua Lipa - Levitating (Official Video)"` would never parse correctly. The function now splits on the separator first on the raw title and strips noise (parentheses, brackets) from each part individually afterwards.
- **Improved MusicBrainz lookup** — Now fetches up to 5 candidates (was 1) and delegates scoring to the shared engine. The second sequential API call for release info has been eliminated — release data is extracted from the recording search response directly, halving MusicBrainz latency per track.
- **Fallback when parsing fails** — Previously, if the title couldn't be split into artist/track, the lookup was skipped entirely. The enrichment pipeline now falls back to the raw YouTube title and uploader name as the search query, giving both Deezer and MusicBrainz a chance to still find a match.
- **Duration passed through `cachedInfo`** — The duration returned by `yt-dlp` during URL validation is now forwarded to the download step, making duration-based scoring work correctly in the common fast path (no re-fetch needed).

#### ⚡ Audio Quality
- **Explicit 320 kbps bitrate** — Added `postprocessorArgs: 'ffmpeg:-b:a 320k'` to the yt-dlp download call. This ensures the output MP3 is always encoded at exactly 320 kbps — the maximum standard MP3 bitrate — regardless of yt-dlp's internal quality defaults.

#### 🔧 Internal / Packaging
- **New service files** — `src/services/deezerService.js`, `src/services/metadataScorer.js`, and `src/services/metadataService.js` added as a clean, layered architecture.
- **Packaged build fix** — `package.json` build files glob updated from `src/services/musicbrainzService.js` to `src/services/**/*.js`, ensuring all service files are included in the packaged Electron app.

---

## v0.6.0 — April 28, 2026

### What's New in v0.6.0

#### ⚡ Performance
- **Eliminated duplicate `yt-dlp` calls** — Metadata fetched during URL validation (title, artist, thumbnail) is now passed directly to the download step via a `cachedInfo` field, removing a redundant `--dump-single-json` call per URL. For a 10-URL batch this halves the number of `yt-dlp` invocations.
- **Reduced rate-limit delay** — The minimum delay between consecutive `yt-dlp` calls was reduced from 2000 ms to 500 ms. Combined with the above, total validation overhead is roughly 4× faster for typical batch sizes.

#### ✨ Improvements
- **Live validation progress** — The progress UI now updates after each individual URL is validated (not once per batch of 5). Each update shows the video **title** and **artist** in a styled card with a music note icon, title on its own line, and artist below it. A smooth fade-in animation plays on each new card.
- **Validation counters** — A live `✓ N validated / ✗ N errors` counter is displayed below the validation progress bar, updating in real time.
- **Consistent status label** — Status now reads `Validating X of N` throughout (previously it flickered between `Checking URL…` and `Validated X of N` due to competing pre- and post-event messages).
- **Retry on failure + export** — After all processing completes, any failed URLs are silently re-validated once. URLs that still fail are written to a `failed-urls-<timestamp>.txt` file (one URL per line) in the downloads folder. The Report screen shows an amber card with the file path and a **Show File** button to reveal it in Finder / Explorer.

#### 🐛 Bug Fixes
- **Removed dead progress callbacks in `MainApp.js`** — Several calls to `onValidationProgress()` were passing data objects instead of callback functions, registering useless IPC listeners that accumulated silently. These have been removed.
- **Progress bar no longer jumps by batch size** — Previously, sending progress events before the `yt-dlp` queue call caused all 5 URLs in a batch to register as "in progress" simultaneously, making the bar jump in steps of 5. Progress now only advances when a URL finishes.

---

## v0.5.0 — April 18, 2026

### About This Project

**YouTube Music Converter** is a cross-platform desktop application built with **React 18** and **Electron 27**. It allows users to batch-download YouTube videos and convert them to high-quality **320kbps MP3** files. Users simply provide a `.txt` file with one YouTube URL per line, and the app handles downloading, audio conversion, metadata embedding, and packaging everything into a single ZIP archive — all from a clean, modern UI.

---

### What's New in v0.5.0

#### 🐛 Bug Fixes
- **Windows .exe now works correctly** — Fixed a runtime crash where `ffmpeg` and `yt-dlp` binaries could not be found when running the packaged app. Electron packages native binaries into `app.asar.unpacked/`, but the paths were still resolving inside `app.asar`. Added path-rewriting logic that corrects binary locations at runtime when running in production.
- **Removed deprecated `remote` module usage** — Cleaned up a dead `remote` import in the preload script (removed in Electron 14+) that would have caused a crash if `getCurrentWindow` was ever called.
- **Improved CI workflow** — The `build-windows.yml` GitHub Action now supports `workflow_dispatch` for manual test runs, with artifact upload so you can download and test the `.exe` directly from the Actions tab without needing to create a release.

#### ✨ Features
- **Batch Processing** — Download and convert multiple YouTube URLs at once by uploading a `.txt` file
- **Drag-and-Drop Upload** — Easily upload your URL list by dragging a `.txt` file onto the app
- **URL Validation** — Each URL is validated before processing begins, with clear feedback on invalid entries
- **Real-Time Progress Tracking** — Individual per-video progress bars alongside an overall batch progress indicator
- **Automatic Metadata Extraction** — Title, artist, and thumbnail are automatically pulled from YouTube and embedded into each MP3
- **ZIP Export** — All converted MP3 files are bundled into a single downloadable ZIP archive
- **Detailed Reports** — Summary of successful downloads, failures, and error messages after each batch run
- **Modern UI** — Clean, minimal interface with smooth animations

#### 🛠 Technical Highlights
- Audio output: **320kbps MP3** via `fluent-ffmpeg` and `ffmpeg-static`
- Metadata embedding via `node-id3`
- ZIP packaging via `jszip`
- YouTube downloading via `ytdl-core` and `youtube-dl-exec`
- MusicBrainz metadata service integration
- Asynchronous batch processing for efficient handling of large URL lists
- Windows builds available as both **NSIS installer** and **portable executable**

---

### Supported Platforms
- Windows (x64) — installer & portable
- macOS

---

### Known Limitations
- Requires an active internet connection
- Only YouTube URLs are supported (`youtube.com/watch?v=...` or `youtu.be/...`)
- Large batches (50+ URLs) may take significant time depending on connection speed

---

### Getting Started

See [QUICKSTART.md](./QUICKSTART.md) for setup and usage instructions.
