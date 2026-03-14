const { app, BrowserWindow, screen, Menu, protocol, net, shell, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;
let floatingButton;
let isPanelVisible = false;
let buttonX = 0;
let isQuitting = false;

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

  popupWindow.on('closed', () => {
    if (!authCompleted && mainWindow && !mainWindow.isDestroyed()) {
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
  return primaryDisplay.workArea;
}

function clampPanelX(x, screenBounds) {
  return Math.max(screenBounds.x, Math.min(x, screenBounds.x + screenBounds.width - PANEL_WIDTH));
}

function createFloatingButton() {
  const screenBounds = getScreenBounds();
  buttonX = screenBounds.width - BUTTON_WIDTH - 100;

  floatingButton = new BrowserWindow({
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    x: buttonX,
    y: screenBounds.y,
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
  
  floatingButton.webContents.on('context-menu', (event, params) => {
    const { Menu, MenuItem } = require('electron');
    const menu = new Menu();
    
    menu.append(new MenuItem({
      label: 'Quit WorkBook',
      click: () => quitApp()
    }));
    
    menu.popup({
      window: floatingButton,
      x: params.x,
      y: params.y
    });
  });
  
  floatingButton.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      quitApp();
    }
  });
  
  floatingButton.on('closed', () => { 
    floatingButton = null;
  });
}

function createMainWindow() {
  Menu.setApplicationMenu(null);
  const screenBounds = getScreenBounds();
  const hiddenY = screenBounds.y - PANEL_HEIGHT;

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

  // Read current position AFTER setBounds has been called by the caller,
  // so we always start from a known-good state.
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
      // setBounds is atomic: sets x, y, width, height in one OS call.
      // This prevents the DPR drift that happens when setSize and setPosition
      // are called separately, where the OS re-applies scaling between calls.
      window.setBounds({ x: currentX, y: currentY, width: PANEL_WIDTH, height: PANEL_HEIGHT });
    } catch (e) {
      if (callback) callback();
      return;
    }

    if (frame < frames) {
      setTimeout(animate, 1000 / fps);
    } else {
      try {
        window.setBounds({ x: targetX, y: targetY, width: PANEL_WIDTH, height: PANEL_HEIGHT });
      } catch (e) { /* ignore */ }
      if (callback) callback();
    }
  };

  animate();
}

function togglePanel() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  const screenBounds = getScreenBounds();
  const panelX = clampPanelX(
    Math.floor(buttonX - (PANEL_WIDTH / 2) + (BUTTON_WIDTH / 2)),
    screenBounds
  );
  const visibleY = screenBounds.y + BUTTON_HEIGHT;
  const hiddenY  = screenBounds.y - PANEL_HEIGHT;

  if (isPanelVisible) {
    slideWindow(mainWindow, panelX, hiddenY, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        // No setSize here — setBounds inside slideWindow already locked the size.
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
    if (floatingButton && !floatingButton.isDestroyed()) {
      floatingButton.hide();
    }
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Atomically reset position+size BEFORE show(), so the OS never sees
      // the window at a wrong size and has no chance to "correct" it.
      mainWindow.setBounds({ x: panelX, y: hiddenY, width: PANEL_WIDTH, height: PANEL_HEIGHT });
      mainWindow.show();
      slideWindow(mainWindow, panelX, visibleY, () => {
        isPanelVisible = true;
      });
    }
  }
}

function quitApp() {
  isQuitting = true;
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
    mainWindow = null;
  }
  
  if (floatingButton && !floatingButton.isDestroyed()) {
    floatingButton.destroy();
    floatingButton = null;
  }
  
  app.quit();
  
  setTimeout(() => {
    app.exit(0);
  }, 1000);
}

ipcMain.on('button-drag-start', (event, screenX) => {
  isDragging = true;
  if (floatingButton && !floatingButton.isDestroyed()) {
    // Store the window's current X and the exact cursor X at drag start.
    // We'll compute delta from the last known cursor position each move,
    // so there's no stale-origin accumulation.
    const [x] = floatingButton.getPosition();
    buttonStartPos = { x };
    dragStartPos = { x: screenX };
  }
});

ipcMain.on('move-window', (event, screenX) => {
  if (!floatingButton || floatingButton.isDestroyed() || !isDragging) return;

  // Delta from drag-start cursor to current cursor, applied to window start pos.
  // This is stable regardless of how many IPC messages were skipped or throttled.
  const deltaX = screenX - dragStartPos.x;
  const newX = buttonStartPos.x + deltaX;
  const screenBounds = getScreenBounds();
  const constrainedX = Math.floor(Math.max(screenBounds.x, Math.min(newX, screenBounds.x + screenBounds.width - BUTTON_WIDTH)));

  floatingButton.setPosition(constrainedX, screenBounds.y);
});

ipcMain.on('button-drag-end', (event, position) => {
  isDragging = false;
  dragStartPos = { x: 0, y: 0 };
  
  if (!floatingButton || floatingButton.isDestroyed()) return;
  
  const [currentX, currentY] = floatingButton.getPosition();
  const screenBounds = getScreenBounds();
  buttonX = Math.floor(Math.max(screenBounds.x, Math.min(currentX, screenBounds.x + screenBounds.width - BUTTON_WIDTH)));
  floatingButton.setPosition(buttonX, screenBounds.y);
  
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
      mainWindow.hide();
      // No setSize here — size is already correct from the last setBounds call.
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
  };

  if (isPanelVisible && mainWindow && !mainWindow.isDestroyed()) {
    const screenBounds = getScreenBounds();
    const hiddenY = screenBounds.y - PANEL_HEIGHT;
    const panelX = clampPanelX(
      Math.floor(buttonX - (PANEL_WIDTH / 2) + (BUTTON_WIDTH / 2)),
      screenBounds
    );
    slideWindow(mainWindow, panelX, hiddenY, doClose);
  } else {
    doClose();
  }
});

ipcMain.on('get-edge', () => {
  if (floatingButton && !floatingButton.isDestroyed()) {
    floatingButton.webContents.send('edge-changed', 'top');
  }
});

app.on('before-quit', () => {
  isQuitting = true;
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
  quitApp();
});

app.on('activate', () => {
  if (!floatingButton) createFloatingButton();
  if (!mainWindow) createMainWindow();
});