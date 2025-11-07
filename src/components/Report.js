import React from 'react';
import './Report.css';

const Report = ({ results, onReset }) => {
  const handleDownloadZip = async () => {
    if (results.zipPath && window.electronAPI) {
      await window.electronAPI.showItemInFolder(results.zipPath);
    }
  };

  return (
    <div className="report-container">
      <div className="report-card">
        <div className="report-header">
          <div className="report-icon success">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h2 className="report-title">Processing Complete</h2>
        </div>

        <div className="report-stats">
          <div className="stat-card success">
            <div className="stat-value">{results.successful}</div>
            <div className="stat-label">Successfully Converted</div>
          </div>
          <div className="stat-card error">
            <div className="stat-value">{results.failed}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>

        {results.failed > 0 && results.failedUrls.length > 0 && (
          <div className="report-failures">
            <h3 className="failures-title">Failed URLs</h3>
            <div className="failures-list">
              {results.failedUrls.map((item, index) => (
                <div key={index} className="failure-item">
                  <div className="failure-url">{item.url}</div>
                  <div className="failure-error">{item.error}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.successful > 0 && results.zipPath && (
          <div className="report-download">
            <p className="download-message">
              All MP3 files have been packaged into a ZIP file.
            </p>
            <button className="btn btn-primary" onClick={handleDownloadZip}>
              Open ZIP File Location
            </button>
          </div>
        )}

        <div className="report-actions">
          <button className="btn btn-secondary" onClick={onReset}>
            Convert More Videos
          </button>
        </div>
      </div>
    </div>
  );
};

export default Report;

