# Release Notes

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
