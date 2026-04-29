import React, { useCallback, useState } from 'react';
import './FileUpload.css';

const FileUpload = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const parseContent = useCallback((content) => {
    try {
      const lines = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        setError('The file is empty. Please provide at least one URL.');
        return;
      }

      const urlPattern = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i;
      const invalidLines = lines.filter((line) => !urlPattern.test(line));

      if (invalidLines.length > 0) {
        setError(
          `Invalid URLs found on ${invalidLines.length} line(s). Each line must contain a single YouTube URL.`
        );
        return;
      }

      const uniqueUrls = [];
      const urlSet = new Set();
      for (const url of lines) {
        if (!urlSet.has(url)) {
          urlSet.add(url);
          uniqueUrls.push(url);
        }
      }

      if (uniqueUrls.length < lines.length) {
        const duplicateCount = lines.length - uniqueUrls.length;
        setError(`Removed ${duplicateCount} duplicate URL${duplicateCount > 1 ? 's' : ''}. Processing ${uniqueUrls.length} unique URL${uniqueUrls.length !== 1 ? 's' : ''}.`);
      } else {
        setError(null);
      }

      onFileUpload(uniqueUrls);
    } catch (err) {
      setError('Failed to read file. Please try again.');
    }
  }, [onFileUpload]);

  const parseFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => parseContent(e.target.result);
    reader.readAsText(file);
  }, [parseContent]);

  const handleBrowseClick = useCallback(async () => {
    // Use Electron's native dialog to avoid the white-flash caused by a
    // programmatic click on a hidden <input type="file"> on Windows.
    if (window.electronAPI?.openFileDialog) {
      const result = await window.electronAPI.openFileDialog();
      if (!result || result.canceled) return;
      if (result.error) {
        setError(`Failed to read file: ${result.error}`);
        return;
      }
      parseContent(result.content);
    }
  }, [parseContent]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type === 'text/plain') {
        parseFile(file);
      } else {
        setError('Please upload a .txt file');
      }
    },
    [parseFile]
  );

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM8 15.5L9.41 17L11 15.28V19H13V15.28L14.59 17L16 15.5L12 11.5L8 15.5Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h2 className="upload-title">Upload URL List</h2>
        <p className="upload-description">
          Drag and drop a .txt file here, or click to browse
        </p>
        <p className="upload-hint">
          Each line should contain a single YouTube URL
        </p>
        <button className="upload-button" onClick={handleBrowseClick}>
          Browse Files
        </button>
        {error && <div className="upload-error">{error}</div>}
      </div>
    </div>
  );
};

export default FileUpload;

