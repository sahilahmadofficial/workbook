const { app, BrowserWindow, screen, Menu, protocol, net, shell, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;
let floatingButton;
let isPanelVisible = false;
let currentEdge = 'right';  // Default edge position

// Window dimensions
const PANEL_WIDTH = 400;
const PANEL_HEIGHT = 700;
const BUTTON_WIDTH = 30;
const BUTTON_HEIGHT = 80;

// Dragging state
let isDragging = false;
let dragStartPos = { x: 0, y: 0 };
let buttonStartPos = { x: 0, y: 0 };

// Register a custom protocol BEFORE app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// Google OAuth popup handler
function attachOAuthInterceptor(popupWindow) {
  popupWindow.webContents.on('will-redirect', (event, targetUrl) => {
    if (handleOAuthRedirect(targetUrl, popupWindow)) {
      event.preventDefault();
    }
  });

  popupWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (handleOAuthRedirect(targetUrl, popupWindow)) {
      event.preventDefault();
    }
  });
}

function handleOAuthRedirect(targetUrl, popupWindow) {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.hostname !== '127.0.0.1') return false;

    const code  = parsed.searchParams.get('code');
    const error = parsed.searchParams.get('error');

    if (mainWindow && !mainWindow.isDestroyed()) {
      const payload = JSON.stringify(code ? { code } : { error: error || 'access_denied' });
      mainWindow.webContents
        .executeJavaScript(`(new BroadcastChannel('google-oauth')).postMessage(${payload});`)
        .catch(console.error);
    }

    setImmediate(() => {
      if (!popupWindow.isDestroyed()) popupWindow.close();
    });

    return true;
  } catch {
    return false;
  }
}

function getScreenBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.workAreaSize;
}

function createFloatingButton() {
  const screenBounds = getScreenBounds();
  const centerY = Math.floor((screenBounds.height - BUTTON_HEIGHT) / 2);
  const rightX = screenBounds.width - BUTTON_WIDTH;

  floatingButton = new BrowserWindow({
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    x: rightX,
    y: centerY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  floatingButton.loadFile(path.join(__dirname, 'button.html'));

  floatingButton.on('closed', () => {
    floatingButton = null;
  });
}

function createMainWindow() {
  Menu.setApplicationMenu(null);

  const screenBounds = getScreenBounds();
  const hiddenX = screenBounds.width;
  const centerY = Math.floor((screenBounds.height - PANEL_HEIGHT) / 2);

  mainWindow = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    x: hiddenX,
    y: centerY,
    frame: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#fafaf9',
  });

  // Intercept window.open for OAuth
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url.startsWith('https://accounts.google.com/')) {
      mainWindow.webContents.once('did-create-window', (popupWindow) => {
        attachOAuthInterceptor(popupWindow);
      });

      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 650,
          title: 'Sign in with Google',
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    }

    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  const isDev = !app.isPackaged || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.error('Failed to load from dev server:', err);
    });
  } else {
    mainWindow.loadURL('app://workbook/index.html').catch((err) => {
      console.error('Failed to load via app:// protocol:', err);
    });
  }

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.isDevToolsOpened()
        ? mainWindow.webContents.closeDevTools()
        : mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.isDevToolsOpened()
        ? mainWindow.webContents.closeDevTools()
        : mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// Smooth slide animation
function slideWindow(window, targetX, targetY, callback) {
  if (!window || window.isDestroyed()) {
    if (callback) callback();
    return;
  }
  
  const [startX, startY] = window.getPosition();
  const duration = 300;
  const fps = 60;
  const frames = (duration / 1000) * fps;
  let frame = 0;

  const animate = () => {
    if (!window || window.isDestroyed()) {
      if (callback) callback();
      return;
    }

    frame++;
    const progress = frame / frames;
    const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out-cubic

    const currentX = Math.round(startX + (targetX - startX) * easeProgress);
    const currentY = Math.round(startY + (targetY - startY) * easeProgress);

    window.setPosition(currentX, currentY);

    if (frame < frames) {
      setTimeout(animate, 1000 / fps);
    } else {
      window.setPosition(targetX, targetY);
      if (callback) callback();
    }
  };

  animate();
}

// Toggle panel visibility
function togglePanel() {
  console.log('togglePanel called, isPanelVisible:', isPanelVisible);
  
  if (!mainWindow || !floatingButton) return;

  const screenBounds = getScreenBounds();
  const centerY = Math.floor((screenBounds.height - PANEL_HEIGHT) / 2);

  if (isPanelVisible) {
    // Hide panel
    const hiddenX = getHiddenPosForEdge(currentEdge, screenBounds);
    slideWindow(mainWindow, hiddenX, centerY, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
      }
      isPanelVisible = false;
      
      // Show button
      if (floatingButton && !floatingButton.isDestroyed()) {
        floatingButton.show();
        setTimeout(() => {
          if (floatingButton && !floatingButton.isDestroyed()) {
            floatingButton.focus();
          }
        }, 100);
      }
    });
  } else {
    // Show panel
    const visibleX = getVisiblePosForEdge(currentEdge, screenBounds);
    
    // Hide button first
    if (floatingButton && !floatingButton.isDestroyed()) {
      floatingButton.hide();
    }
    
    // Show panel
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      slideWindow(mainWindow, visibleX, centerY, () => {
        isPanelVisible = true;
      });
    }
  }
}

function getHiddenPosForEdge(edge, screenBounds) {
  switch(edge) {
    case 'left': return -PANEL_WIDTH;
    case 'right': return screenBounds.width;
    case 'top': return 0;
    case 'bottom': return 0;
    default: return screenBounds.width;
  }
}

function getVisiblePosForEdge(edge, screenBounds) {
  switch(edge) {
    case 'left': return 0;
    case 'right': return screenBounds.width - PANEL_WIDTH;
    case 'top': return 0;
    case 'bottom': return 0;
    default: return screenBounds.width - PANEL_WIDTH;
  }
}

function snapToEdge(x, y) {
  const screenBounds = getScreenBounds();
  const centerX = x;
  const centerY = y;
  
  // Calculate distances to each edge
  const distLeft = centerX;
  const distRight = screenBounds.width - centerX;
  const distTop = centerY;
  const distBottom = screenBounds.height - centerY;
  
  // Find closest edge
  const minDist = Math.min(distLeft, distRight, distTop, distBottom);
  
  let edge, finalX, finalY;
  
  if (minDist === distRight) {
    edge = 'right';
    finalX = screenBounds.width - BUTTON_WIDTH;
    finalY = Math.max(0, Math.min(centerY, screenBounds.height - BUTTON_HEIGHT));
  } else if (minDist === distLeft) {
    edge = 'left';
    finalX = 0;
    finalY = Math.max(0, Math.min(centerY, screenBounds.height - BUTTON_HEIGHT));
  } else if (minDist === distTop) {
    edge = 'top';
    finalX = Math.max(0, Math.min(centerX, screenBounds.width - BUTTON_WIDTH));
    finalY = 0;
  } else {
    edge = 'bottom';
    finalX = Math.max(0, Math.min(centerX, screenBounds.width - BUTTON_WIDTH));
    finalY = screenBounds.height - BUTTON_HEIGHT;
  }
  
  return { edge, x: finalX, y: finalY };
}

// IPC Handlers
ipcMain.on('button-drag-start', () => {
  console.log('Drag start');
  isDragging = true;
  if (floatingButton && !floatingButton.isDestroyed()) {
    const [x, y] = floatingButton.getPosition();
    buttonStartPos = { x, y };
    dragStartPos = { x: 0, y: 0 };
  }
});

ipcMain.on('move-window', (event, screenX, screenY) => {
  if (!floatingButton || floatingButton.isDestroyed()) return;

  if (dragStartPos.x === 0 && dragStartPos.y === 0) {
    dragStartPos = { x: screenX, y: screenY };
  }

  const deltaX = screenX - dragStartPos.x;
  const deltaY = screenY - dragStartPos.y;

  const newX = buttonStartPos.x + deltaX;
  const newY = buttonStartPos.y + deltaY;

  floatingButton.setPosition(newX, newY);
});

ipcMain.on('button-drag-end', (event, position) => {
  console.log('Drag end');
  isDragging = false;
  dragStartPos = { x: 0, y: 0 };
  
  if (!floatingButton || floatingButton.isDestroyed()) return;
  
  const [currentX, currentY] = floatingButton.getPosition();
  const snapped = snapToEdge(currentX, currentY);
  
  currentEdge = snapped.edge;
  floatingButton.setPosition(snapped.x, snapped.y);
  
  // Notify button of edge change
  if (floatingButton && !floatingButton.isDestroyed()) {
    floatingButton.webContents.send('edge-changed', snapped.edge);
  }
});

ipcMain.on('toggle-panel', () => {
  console.log('IPC: toggle-panel received');
  togglePanel();
});

ipcMain.on('close-panel', () => {
  console.log('IPC: close-panel received');
  if (isPanelVisible) {
    togglePanel();
  }
});

ipcMain.on('get-edge', () => {
  if (floatingButton && !floatingButton.isDestroyed()) {
    floatingButton.webContents.send('edge-changed', currentEdge);
  }
});

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const filePath = new URL(request.url).pathname;
    const fullPath = path.join(__dirname, '../dist', filePath);
    return net.fetch(url.pathToFileURL(fullPath).toString());
  });

  createFloatingButton();
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!floatingButton) createFloatingButton();
  if (!mainWindow) createMainWindow();
});
