const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script that exposes safe IPC methods to the renderer process
 * Uses contextBridge for security
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Button drag events
  onButtonDragStart: () => ipcRenderer.send('button-drag-start'),
  onButtonDragEnd: (position) => ipcRenderer.send('button-drag-end', position),
  moveWindow: (x, y) => ipcRenderer.send('move-window', x, y),
  
  // Panel toggle
  togglePanel: () => ipcRenderer.send('toggle-panel'),
  closePanel: () => ipcRenderer.send('close-panel'),
  
  // Edge position updates
  getEdge: () => ipcRenderer.send('get-edge'),
  onEdgeChanged: (callback) => ipcRenderer.on('edge-changed', (event, edge) => callback(edge))
});