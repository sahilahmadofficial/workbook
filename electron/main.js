const { app, BrowserWindow, screen, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // Remove default menu bar (File, Edit, View, etc.)
  Menu.setApplicationMenu(null);
  
  // Get screen dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Window dimensions
  const windowWidth = 400;
  const windowHeight = 700;
  
  // Position on right side, vertically centered
  const x = screenWidth - windowWidth;
  const y = Math.floor((screenHeight - windowHeight) / 2);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    frame: true,              // Show frame with close/minimize buttons
    resizable: true,          // Allow resizing
    minimizable: true,        // Show minimize button
    maximizable: true,        // Show maximize button
    closable: true,           // Show close button
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#fafaf9',
    title: 'WorkBook',        // Window title
  });

  // Check if running in development mode
  const isDev = !app.isPackaged || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.error('Failed to load from dev server:', err);
      console.log('Make sure Vite dev server is running on http://localhost:5173');
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch((err) => {
      console.error('Failed to load built files:', err);
    });
  }

  // Enable keyboard shortcuts for DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F12 to toggle DevTools
    if (input.key === 'F12') {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    }
    // Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows/Linux)
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});