import React from 'react';
import './URLPreview.css';

const URLPreview = ({ urls, onStartDownload, onBack }) => {
  return (
    <div className="url-preview-container">
      <div className="preview-card">
        <div className="preview-header">
          <h2>URL Preview</h2>
          <p className="preview-count">{urls.length} URL(s) found</p>
        </div>

        <div className="preview-list">
          {urls.map((url, index) => (
            <div key={index} className="preview-item">
              <span className="preview-number">{index + 1}</span>
              <span className="preview-url">{url}</span>
            </div>
          ))}
        </div>

        <div className="preview-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button className="btn btn-primary" onClick={onStartDownload}>
            Start Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default URLPreview;

