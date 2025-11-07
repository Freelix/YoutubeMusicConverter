import React, { useCallback, useState } from 'react';
import './FileUpload.css';

const FileUpload = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const parseFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const lines = content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length === 0) {
          setError('The file is empty. Please provide at least one URL.');
          return;
        }

        // Basic URL validation
        const urlPattern = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i;
        const invalidLines = lines.filter((line) => !urlPattern.test(line));

        if (invalidLines.length > 0) {
          setError(
            `Invalid URLs found on ${invalidLines.length} line(s). Each line must contain a single YouTube URL.`
          );
          return;
        }

        setError(null);
        onFileUpload(lines);
      } catch (err) {
        setError('Failed to read file. Please try again.');
      }
    };
    reader.readAsText(file);
  }, [onFileUpload]);

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

  const handleFileInput = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          parseFile(file);
        } else {
          setError('Please upload a .txt file');
        }
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
        <label className="upload-button">
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          Browse Files
        </label>
        {error && <div className="upload-error">{error}</div>}
      </div>
    </div>
  );
};

export default FileUpload;

