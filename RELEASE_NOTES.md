# Release Notes

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
