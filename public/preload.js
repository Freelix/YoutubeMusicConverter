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
contextBridge.exposeInMainWorld('electronAPI', {
  validateUrl: (url) => invokeWithErrorHandling('validate-url', url),
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

