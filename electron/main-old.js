const { app, BrowserWindow, screen, Menu, protocol, net, shell } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

// Register a custom protocol BEFORE app is ready.
// Firebase Auth requires location.protocol to be http/https/chrome-extension.
// Serving via a custom "app://" protocol satisfies Firebase's check.
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

// ---------------------------------------------------------------------------
// Google OAuth popup handler
// ---------------------------------------------------------------------------
// Flow:
//   1. Renderer calls window.open('https://accounts.google.com/...')
//   2. setWindowOpenHandler allows it as a BrowserWindow popup
//   3. After the user consents, Google redirects the popup to
//      http://127.0.0.1:<port>?code=...
//   4. We intercept that navigation BEFORE it happens (will-navigate /
//      will-redirect), extract the code, send it to the renderer, and
//      close the popup — so Electron never tries to actually load the
//      127.0.0.1 URL (which has no server and causes ERR_CONNECTION_REFUSED)
// ---------------------------------------------------------------------------

function attachOAuthInterceptor(popupWindow) {
  // Fires when Chromium is about to redirect — catch it before load attempt
  popupWindow.webContents.on('will-redirect', (event, targetUrl) => {
    if (handleOAuthRedirect(targetUrl, popupWindow)) {
      // Prevent Electron from actually navigating to 127.0.0.1 (no server there)
      event.preventDefault();
    }
  });

  // Fallback: some OAuth flows use a direct navigation rather than a redirect
  popupWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (handleOAuthRedirect(targetUrl, popupWindow)) {
      event.preventDefault();
    }
  });
}

// Returns true if the URL was the OAuth callback and was handled
function handleOAuthRedirect(targetUrl, popupWindow) {
  try {
    const parsed = new URL(targetUrl);

    // Only intercept loopback redirects: http://127.0.0.1:<port>?code=...
    if (parsed.hostname !== '127.0.0.1') return false;

    const code  = parsed.searchParams.get('code');
    const error = parsed.searchParams.get('error');

    // Post the result back to the main renderer via BroadcastChannel
    if (mainWindow && !mainWindow.isDestroyed()) {
      const payload = JSON.stringify(code ? { code } : { error: error || 'access_denied' });
      mainWindow.webContents
        .executeJavaScript(`(new BroadcastChannel('google-oauth')).postMessage(${payload});`)
        .catch(console.error);
    }

    // Close the popup immediately — no need to load the redirect URL
    setImmediate(() => {
      if (!popupWindow.isDestroyed()) popupWindow.close();
    });

    return true;
  } catch {
    return false;
  }
}

function createWindow() {
  Menu.setApplicationMenu(null);

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth  = 400;
  const windowHeight = 700;
  const x = screenWidth - windowWidth;
  const y = Math.floor((screenHeight - windowHeight) / 2);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    frame: true,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#fafaf9',
    title: 'WorkBook',
  });

  // Intercept ALL window.open() calls from the renderer
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url.startsWith('https://accounts.google.com/')) {
      // Let Electron create a popup for Google auth, then attach interceptor
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

    // All other links open in the system browser
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

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const filePath = new URL(request.url).pathname;
    const fullPath = path.join(__dirname, '../dist', filePath);
    return net.fetch(url.pathToFileURL(fullPath).toString());
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});