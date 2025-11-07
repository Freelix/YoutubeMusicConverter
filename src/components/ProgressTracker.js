import React, { useState, useEffect } from 'react';
import './ProgressTracker.css';

const ProgressTracker = ({ totalUrls, validatedUrls }) => {
  const [videoProgress, setVideoProgress] = useState({});
  const [overallProgress, setOverallProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (!window.electronAPI) return;

    const handleProgress = (data) => {
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

    window.electronAPI.onVideoProgress(handleProgress);

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeVideoProgressListener();
      }
    };
  }, []);

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
  const isValidating = validatedUrls.length === 0;

  return (
    <div className="progress-tracker-container">
      <div className="progress-card">
        <h2 className="progress-title">Processing Videos</h2>

        {isValidating ? (
          <div className="validating-message">
            <div className="loader-spinner"></div>
            <p>Validating URLs...</p>
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
                <div className="video-info">
                  <span className="video-title">
                    {urlData.title || urlData.url}
                  </span>
                  <span className="video-author">{urlData.author}</span>
                </div>
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

