# YouTube Music Converter

A desktop application built with Electron and React that downloads and converts YouTube videos to high-quality MP3 files (320kbps).

## Features

- 🎵 **Batch Processing**: Download multiple YouTube videos from a text file
- 📁 **File Upload**: Drag-and-drop or browse to upload a .txt file with YouTube URLs
- ✅ **URL Validation**: Validates each URL before processing
- 📊 **Progress Tracking**: Real-time progress bars for individual videos and overall batch
- 🎨 **Metadata**: Automatically extracts and embeds video metadata (title, artist, thumbnail)
- 📦 **ZIP Export**: Packages all MP3 files into a single ZIP archive
- 📋 **Detailed Reports**: Shows success/failure counts and error details
- 🎨 **Modern UI**: Clean, minimal design with smooth animations

## Requirements

- Node.js 16+ and npm
- FFmpeg (automatically installed via ffmpeg-static package)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd YoutubeMusicConverterReact
```

2. Install dependencies:
```bash
npm install
```

## Development

To run the application in development mode:

```bash
# Terminal 1: Start React development server
npm start

# Terminal 2: Start Electron
npm run electron-dev
```

## Building

To build the application for production:

```bash
# Build React app
npm run build

# Build Electron app
npm run electron-pack
```

The built application will be in the `dist` directory.

## Usage

1. **Prepare your URL list**: Create a `.txt` file with one YouTube URL per line:
   ```
   https://www.youtube.com/watch?v=VIDEO_ID_1
   https://www.youtube.com/watch?v=VIDEO_ID_2
   https://www.youtube.com/watch?v=VIDEO_ID_3
   ```

2. **Upload the file**: Drag and drop the `.txt` file or click to browse

3. **Preview URLs**: Review the list of URLs before starting the download

4. **Start Download**: Click "Start Download" to begin processing

5. **Monitor Progress**: Watch real-time progress for each video

6. **Get Results**: View the report and download the ZIP file containing all MP3s

## File Format

The `.txt` file must follow these rules:
- One URL per line
- Each line must contain a valid YouTube URL
- Empty lines are ignored
- URLs must be in format: `https://www.youtube.com/watch?v=...` or `https://youtu.be/...`

## Technical Details

- **Audio Quality**: 320kbps MP3
- **Metadata**: Automatically extracted from YouTube (title, artist, thumbnail as album art)
- **Processing**: Asynchronous batch processing for efficient handling of large lists
- **Platform**: Windows and macOS desktop applications

## Dependencies

- React 18
- Electron 27
- ytdl-core: YouTube video downloading
- fluent-ffmpeg: Audio conversion
- ffmpeg-static: FFmpeg binary
- jszip: ZIP file creation
- node-id3: MP3 metadata embedding

## License

MIT

