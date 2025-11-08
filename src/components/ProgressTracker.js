import React, { useState, useEffect } from 'react';
import './ProgressTracker.css';

// Helper function to get YouTube thumbnail URL from video URL
const getYoutubeThumbnail = (url) => {
  // Extract video ID from URL
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;
  
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
  return '';
};

const ProgressTracker = ({ totalUrls, validatedUrls }) => {
  const [videoProgress, setVideoProgress] = useState({});
  const [validationProgress, setValidationProgress] = useState({
    current: 0,
    total: totalUrls,
    status: 'Waiting to start...',
    currentUrl: ''
  });
  const [overallProgress, setOverallProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (!window.electronAPI) return;

    const handleVideoProgress = (data) => {
      setVideoProgress((prev) => {
        const newProgress = {
          ...prev,
          [data.index]: data.progress,
        };
        
        // Count completed videos
        const completed = Object.values(newProgress).filter((p) => p >= 100).length;
        setCompletedCount(completed);
        
        return newProgress;
      });
    };

    const handleValidationProgress = (data) => {
      setValidationProgress({
        current: data.current || 0,
        total: data.total || totalUrls,
        status: data.status || 'Validating...',
        currentUrl: data.currentUrl || ''
      });
    };

    window.electronAPI.onVideoProgress(handleVideoProgress);
    window.electronAPI.onValidationProgress(handleValidationProgress);

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeVideoProgressListener();
        window.electronAPI.removeValidationProgressListener();
      }
    };
  }, [totalUrls]);

  useEffect(() => {
    const validCount = validatedUrls.filter((v) => v.valid).length;
    if (validCount === 0) return;

    const progressValues = validatedUrls
      .filter((v) => v.valid)
      .map((v) => videoProgress[v.index] || 0);
    
    if (progressValues.length > 0) {
      const avgProgress =
        progressValues.reduce((sum, p) => sum + p, 0) / validCount;
      setOverallProgress(avgProgress);
    }
  }, [videoProgress, validatedUrls]);

  const validUrls = validatedUrls.filter((v) => v.valid);
  const invalidUrls = validatedUrls.filter((v) => !v.valid);
  const isValidating = validatedUrls.length < totalUrls && validationProgress.current < totalUrls;

  return (
    <div className="progress-tracker-container">
      <div className="progress-card">
        <h2 className="progress-title">Processing Videos</h2>

        {isValidating ? (
          <div className="validating-message">
            <div className="loader-spinner"></div>
            <div className="validation-progress">
              <p className="validation-status">{validationProgress.status}</p>
              {validationProgress.currentUrl && (
                <p className="current-url">
                  {validationProgress.currentUrl.length > 50 
                    ? `${validationProgress.currentUrl.substring(0, 47)}...`
                    : validationProgress.currentUrl}
                </p>
              )}
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{
                    width: `${(validationProgress.current / validationProgress.total) * 100}%`,
                    backgroundColor: '#4CAF50'
                  }}
                />
              </div>
              <p className="progress-text">
                {validationProgress.current} of {validationProgress.total} URLs validated
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overall-progress">
              <div className="progress-header">
                <span>Overall Progress</span>
                <span className="progress-percentage">
                  {completedCount} / {validUrls.length} completed ({Math.round(overallProgress)}%)
                </span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            <div className="video-progress-list">
              <h3 className="section-title">Valid Videos ({validUrls.length})</h3>
              {validUrls.map((urlData, idx) => {
            const progress = videoProgress[urlData.index] || 0;
            return (
              <div key={idx} className="video-progress-item">
                <div className="video-thumbnail">
                  <img 
                    src={getYoutubeThumbnail(urlData.url)} 
                    alt="Video thumbnail" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="thumbnail-fallback">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 16.5L16 12L10 7.5V16.5ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
                <div className="video-info">
                  <span className="video-title">
                    {urlData.title || urlData.url}
                  </span>
                  <span className="video-author">{urlData.author}</span>
                  <div className="video-progress-bar">
                    <div
                      className="video-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="video-progress-text">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
            );
          })}

          {invalidUrls.length > 0 && (
            <>
              <h3 className="section-title error-title">
                Invalid URLs ({invalidUrls.length})
              </h3>
              {invalidUrls.map((urlData, idx) => (
                <div key={idx} className="video-progress-item error">
                  <div className="video-info">
                    <span className="video-title">{urlData.url}</span>
                    <span className="video-error">{urlData.error}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressTracker;

