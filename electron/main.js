const { app, BrowserWindow, screen, Menu, protocol, net, shell, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;
let floatingButton;
let isPanelVisible = false;
let buttonX = 0;

const PANEL_WIDTH = 400;
const PANEL_HEIGHT = 700;
const BUTTON_WIDTH = 80;
const BUTTON_HEIGHT = 30;

let isDragging = false;
let dragStartPos = { x: 0, y: 0 };
let buttonStartPos = { x: 0, y: 0 };

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

function attachOAuthInterceptor(popupWindow) {
  let authCompleted = false;

  popupWindow.webContents.on('will-redirect', (event, targetUrl) => {
    if (handleOAuthRedirect(targetUrl, popupWindow)) {
      authCompleted = true;
      event.preventDefault();
    }
  });

  popupWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (handleOAuthRedirect(targetUrl, popupWindow)) {
      authCompleted = true;
      event.preventDefault();
    }
  });

  // FIX: Detect when user closes popup with X button
  popupWindow.on('closed', () => {
    if (!authCompleted && mainWindow && !mainWindow.isDestroyed()) {
      // User closed the popup without completing authentication
      const payload = JSON.stringify({ error: 'access_denied' });
      mainWindow.webContents
        .executeJavaScript(`(new BroadcastChannel('google-oauth')).postMessage(${payload});`)
        .catch(console.error);
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
  buttonX = screenBounds.width - BUTTON_WIDTH - 150;

  floatingButton = new BrowserWindow({
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    x: buttonX,
    y: 0,
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
  floatingButton.on('closed', () => { floatingButton = null; });
}

function createMainWindow() {
  Menu.setApplicationMenu(null);
  const hiddenY = -PANEL_HEIGHT;

  mainWindow = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    x: buttonX - (PANEL_WIDTH / 2) + (BUTTON_WIDTH / 2),
    y: hiddenY,
    frame: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#fafaf9',
  });

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
    mainWindow.loadURL('http://localhost:5173').catch(console.error);
  } else {
    mainWindow.loadURL('app://workbook/index.html').catch(console.error);
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
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    const currentX = Math.round(startX + (targetX - startX) * easeProgress);
    const currentY = Math.round(startY + (targetY - startY) * easeProgress);

    try {
      window.setSize(PANEL_WIDTH, PANEL_HEIGHT);
      window.setPosition(currentX, currentY);
    } catch (e) {
      if (callback) callback();
      return;
    }

    if (frame < frames) {
      setTimeout(animate, 1000 / fps);
    } else {
      try {
        window.setSize(PANEL_WIDTH, PANEL_HEIGHT);
        window.setPosition(targetX, targetY);
      } catch (e) { /* ignore */ }
      if (callback) callback();
    }
  };

  animate();
}

function togglePanel() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  const screenBounds = getScreenBounds();

  if (isPanelVisible) {
    const hiddenY = -PANEL_HEIGHT;
    const panelX = Math.floor(buttonX - (PANEL_WIDTH / 2) + (BUTTON_WIDTH / 2));
    const constrainedX = Math.max(0, Math.min(panelX, screenBounds.width - PANEL_WIDTH));
    
    slideWindow(mainWindow, constrainedX, hiddenY, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        mainWindow.setSize(PANEL_WIDTH, PANEL_HEIGHT);
      }
      isPanelVisible = false;
      
      if (!floatingButton || floatingButton.isDestroyed()) {
        createFloatingButton();
      } else {
        floatingButton.show();
        floatingButton.setAlwaysOnTop(true, 'floating');
        setTimeout(() => {
          if (floatingButton && !floatingButton.isDestroyed()) {
            floatingButton.focus();
          }
        }, 100);
      }
    });
  } else {
    const visibleY = BUTTON_HEIGHT;
    const panelX = Math.floor(buttonX - (PANEL_WIDTH / 2) + (BUTTON_WIDTH / 2));
    const constrainedX = Math.max(0, Math.min(panelX, screenBounds.width - PANEL_WIDTH));
    
    if (floatingButton && !floatingButton.isDestroyed()) {
      floatingButton.hide();
    }
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setSize(PANEL_WIDTH, PANEL_HEIGHT);
      mainWindow.show();
      slideWindow(mainWindow, constrainedX, visibleY, () => {
        isPanelVisible = true;
      });
    }
  }
}

ipcMain.on('button-drag-start', () => {
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
  const newX = buttonStartPos.x + deltaX;
  const screenBounds = getScreenBounds();
  const constrainedX = Math.floor(Math.max(0, Math.min(newX, screenBounds.width - BUTTON_WIDTH)));

  floatingButton.setPosition(constrainedX, 0);
});

ipcMain.on('button-drag-end', (event, position) => {
  isDragging = false;
  dragStartPos = { x: 0, y: 0 };
  
  if (!floatingButton || floatingButton.isDestroyed()) return;
  
  const [currentX, currentY] = floatingButton.getPosition();
  const screenBounds = getScreenBounds();
  buttonX = Math.floor(Math.max(0, Math.min(currentX, screenBounds.width - BUTTON_WIDTH)));
  floatingButton.setPosition(buttonX, 0);
  
  if (floatingButton && !floatingButton.isDestroyed()) {
    floatingButton.webContents.send('edge-changed', 'top');
  }
});

ipcMain.on('toggle-panel', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    setTimeout(togglePanel, 50);
    return;
  }
  togglePanel();
});

ipcMain.on('close-panel', () => {
  const doClose = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
      mainWindow = null;
    }
    isPanelVisible = false;
    createMainWindow();

    if (!floatingButton || floatingButton.isDestroyed()) {
      createFloatingButton();
    } else {
      floatingButton.show();
      floatingButton.setAlwaysOnTop(true, 'floating');
      setTimeout(() => {
        if (floatingButton && !floatingButton.isDestroyed()) {
          floatingButton.focus();
        }
      }, 100);
    }
  };

  if (isPanelVisible && mainWindow && !mainWindow.isDestroyed()) {
    const screenBounds = getScreenBounds();
    const hiddenY = -PANEL_HEIGHT;
    const panelX = Math.floor(buttonX - (PANEL_WIDTH / 2) + (BUTTON_WIDTH / 2));
    const constrainedX = Math.max(0, Math.min(panelX, screenBounds.width - PANEL_WIDTH));
    slideWindow(mainWindow, constrainedX, hiddenY, doClose);
  } else {
    doClose();
  }
});

ipcMain.on('get-edge', () => {
  if (floatingButton && !floatingButton.isDestroyed()) {
    floatingButton.webContents.send('edge-changed', 'top');
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