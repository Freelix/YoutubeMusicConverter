import React, { useState, useCallback, useEffect } from 'react';
import FileUpload from './FileUpload';
import URLPreview from './URLPreview';
import ProgressTracker from './ProgressTracker';
import Report from './Report';
import './MainApp.css';

const MainApp = () => {
  const [urls, setUrls] = useState([]);
  const [validatedUrls, setValidatedUrls] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [downloadResults, setDownloadResults] = useState(null);
  const [currentStep, setCurrentStep] = useState('upload'); // upload, preview, processing, report

  const handleFileUpload = useCallback((parsedUrls) => {
    setUrls(parsedUrls);
    setCurrentStep('preview');
    setShowPreview(true);
  }, []);

  const handleStartDownload = useCallback(async () => {
    console.log('Starting download process...');
    
    // Check if electronAPI is available
    if (!window.electronAPI) {
      const errorMsg = 'Electron API is not available. Is the app running in Electron?';
      console.error(errorMsg);
      alert(errorMsg);
      return;
    }
    
    console.log('Electron API is available:', Object.keys(window.electronAPI));

    setIsProcessing(true);
    setCurrentStep('processing');
    setShowPreview(false);

    console.log('Starting URL validation for', urls.length, 'URLs');
    
    // Validate all URLs first
    const validationResults = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n--- Validating URL ${i + 1}/${urls.length}:`, url);
      
      try {
        console.log('Calling validateUrl...');
        const result = await window.electronAPI.validateUrl(url);
        console.log('Validation result:', result);
        
        validationResults.push({
          url,
          index: i,
          ...result,
        });
      } catch (error) {
        console.error('Validation error:', error);
        validationResults.push({
          url,
          index: i,
          valid: false,
          error: error.message || 'Unknown error during validation',
          stack: error.stack
        });
      }
      
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('All validations complete. Results:', validationResults);

    setValidatedUrls(validationResults);

    // Download valid videos
    const validResults = validationResults.filter((result) => result.valid);
    const downloadPromises = validResults.map((result) =>
      window.electronAPI.downloadVideo({
        url: result.url,
        index: result.index,
        total: validResults.length,
      })
    );

    const results = await Promise.allSettled(downloadPromises);

    const successfulDownloads = [];
    const failedDownloads = [];

    results.forEach((result, idx) => {
      const validation = validResults[idx];
      if (result.status === 'fulfilled' && result.value.success) {
        successfulDownloads.push(result.value);
      } else {
        failedDownloads.push({
          url: validation.url,
          error: result.reason?.error || result.value?.error || 'Unknown error',
        });
      }
    });

    // Add validation failures
    validationResults.forEach((result) => {
      if (!result.valid) {
        failedDownloads.push({
          url: result.url,
          error: result.error || 'Invalid URL',
        });
      }
    });

    // Create ZIP if there are successful downloads
    let zipPath = null;
    if (successfulDownloads.length > 0) {
      const zipResult = await window.electronAPI.createZip(successfulDownloads);
      if (zipResult.success) {
        zipPath = zipResult.path;
      }
    }

    setDownloadResults({
      successful: successfulDownloads.length,
      failed: failedDownloads.length,
      failedUrls: failedDownloads,
      zipPath,
    });

    setIsProcessing(false);
    setCurrentStep('report');
  }, [urls]);

  const handleReset = useCallback(() => {
    setUrls([]);
    setValidatedUrls([]);
    setIsProcessing(false);
    setShowPreview(false);
    setDownloadResults(null);
    setCurrentStep('upload');
    window.electronAPI.cleanup();
  }, []);

  useEffect(() => {
    if (currentStep === 'processing') {
      const handleProgress = (data) => {
        // Progress is handled in ProgressTracker component
      };

      window.electronAPI.onVideoProgress(handleProgress);

      return () => {
        window.electronAPI.removeVideoProgressListener();
      };
    }
  }, [currentStep]);

  return (
    <div className="main-app">
      <header className="app-header">
        <h1>YouTube Music Converter</h1>
        <p className="subtitle">Convert YouTube videos to high-quality MP3 files</p>
      </header>

      <main className="app-main">
        {currentStep === 'upload' && (
          <FileUpload onFileUpload={handleFileUpload} />
        )}

        {currentStep === 'preview' && (
          <URLPreview
            urls={urls}
            onStartDownload={handleStartDownload}
            onBack={() => {
              setCurrentStep('upload');
              setShowPreview(false);
            }}
          />
        )}

        {currentStep === 'processing' && (
          <ProgressTracker
            totalUrls={urls.length}
            validatedUrls={validatedUrls}
          />
        )}

        {currentStep === 'report' && downloadResults && (
          <Report
            results={downloadResults}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
};

export default MainApp;

