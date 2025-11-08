const { contextBridge, ipcRenderer } = require('electron');

// Helper function to safely invoke IPC methods
const invokeWithErrorHandling = async (method, ...args) => {
  try {
    console.log(`[Preload] Calling ${method} with args:`, args);
    const result = await ipcRenderer.invoke(method, ...args);
    console.log(`[Preload] ${method} result:`, result);
    return result;
  } catch (error) {
    const errorMsg = `[Preload] Error in ${method}: ${error.message}`;
    console.error(errorMsg, error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to execute ${method}: ${error.message}`);
  }
};

// Expose the API to the renderer process
const { remote } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getCurrentWindow: () => remote.getCurrentWindow(),
  validateUrl: (url) => invokeWithErrorHandling('validate-url', url),
  onValidationProgress: (callback) => {
    try {
      // Store the callback with a unique ID
      const callbackId = `validation-progress-${Date.now()}`;
      const listener = (event, data) => {
        try {
          if (typeof callback === 'function') {
            callback(data);
          }
        } catch (err) {
          console.error('Error in validation progress callback:', err);
        }
      };
      
      // Store the listener with its ID
      window._validationProgressListeners = window._validationProgressListeners || {};
      window._validationProgressListeners[callbackId] = listener;
      
      // Add the listener
      ipcRenderer.on('validation-progress', listener);
      
      // Return the ID for later removal if needed
      return callbackId;
    } catch (error) {
      console.error('Error setting up validation progress listener:', error);
      return null;
    }
  },
  removeValidationProgressListener: (callbackId) => {
    try {
      if (window._validationProgressListeners && window._validationProgressListeners[callbackId]) {
        ipcRenderer.removeListener('validation-progress', window._validationProgressListeners[callbackId]);
        delete window._validationProgressListeners[callbackId];
      } else if (!callbackId) {
        // If no callbackId is provided, remove all listeners
        ipcRenderer.removeAllListeners('validation-progress');
        if (window._validationProgressListeners) {
          delete window._validationProgressListeners;
        }
      }
    } catch (error) {
      console.error('Error removing validation progress listener:', error);
    }
  },
  downloadVideo: (data) => invokeWithErrorHandling('download-video', data),
  createZip: (files) => invokeWithErrorHandling('create-zip', files),
  cleanup: () => invokeWithErrorHandling('cleanup'),
  showSaveDialog: () => invokeWithErrorHandling('show-save-dialog'),
  showItemInFolder: (filePath) => invokeWithErrorHandling('show-item-in-folder', filePath),
  onVideoProgress: (callback) => {
    try {
      ipcRenderer.on('video-progress', (event, data) => {
        try {
          callback(data);
        } catch (err) {
          console.error('Error in progress callback:', err);
        }
      });
    } catch (error) {
      console.error('Error setting up progress listener:', error);
    }
  },
  removeVideoProgressListener: () => {
    try {
      ipcRenderer.removeAllListeners('video-progress');
    } catch (error) {
      console.error('Error removing progress listener:', error);
    }
  },
});

// Log that the preload script has loaded
console.log('Preload script loaded successfully');

