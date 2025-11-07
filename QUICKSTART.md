# Quick Start Guide

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode

1. Start the React development server:
```bash
npm start
```

2. In a new terminal, start Electron:
```bash
npm run electron-dev
```

### Production Build

1. Build the React app:
```bash
npm run build
```

2. Build the Electron app:
```bash
npm run electron-pack
```

The built application will be in the `dist` directory.

## Creating a URL List File

Create a `.txt` file with one YouTube URL per line:

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://www.youtube.com/watch?v=9bZkp7q19f0
https://youtu.be/jNQXAC9IVRw
```

## Usage Flow

1. **Upload**: Drag and drop your `.txt` file or click to browse
2. **Preview**: Review the list of URLs
3. **Download**: Click "Start Download" to begin processing
4. **Monitor**: Watch progress bars for each video
5. **Download**: Get your ZIP file with all MP3s

## Features

- ✅ Batch processing of multiple URLs
- ✅ Real-time progress tracking
- ✅ URL validation before processing
- ✅ High-quality MP3 (320kbps)
- ✅ Automatic metadata extraction
- ✅ ZIP file packaging
- ✅ Detailed success/failure reports

## Troubleshooting

- **FFmpeg errors**: The app includes ffmpeg-static, but if you encounter issues, ensure FFmpeg is installed on your system
- **Download failures**: Check your internet connection and ensure YouTube URLs are accessible
- **Large batches**: The app handles 20+ URLs efficiently with async processing

