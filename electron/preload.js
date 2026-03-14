const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script that exposes safe IPC methods to the renderer process
 * Uses contextBridge for security
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Button drag events
  onButtonDragStart: (screenX) => ipcRenderer.send('button-drag-start', screenX),
  onButtonDragEnd: (position) => ipcRenderer.send('button-drag-end', position),
  moveWindow: (x) => ipcRenderer.send('move-window', x),
  
  // Panel toggle
  togglePanel: () => ipcRenderer.send('toggle-panel'),
  closePanel: () => ipcRenderer.send('close-panel'),
  
  // Edge position updates
  getEdge: () => ipcRenderer.send('get-edge'),
  onEdgeChanged: (callback) => ipcRenderer.on('edge-changed', (event, edge) => callback(edge))
});