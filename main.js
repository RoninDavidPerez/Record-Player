const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 150,
    minHeight: 150,
    resizable: true,
    backgroundColor: '#e9e3f5',
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function scanFolderForMp3(folderPath) {
  const files = fs.readdirSync(folderPath, { withFileTypes: true });
  return files
    .filter((f) => f.isFile() && /\.(mp3|wav|ogg|m4a|flac)$/i.test(f.name))
    .map((f) => ({
      fileName: f.name,
      filePath: path.join(folderPath, f.name),
    }));
}

ipcMain.handle('pick-music-folder', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose your music folder',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const folderPath = result.filePaths[0];
  const config = loadConfig();
  config.musicFolder = folderPath;
  saveConfig(config);

  return { folderPath, tracks: scanFolderForMp3(folderPath) };
});

ipcMain.handle('get-saved-folder', async () => {
  const config = loadConfig();
  if (!config.musicFolder || !fs.existsSync(config.musicFolder)) return null;
  return { folderPath: config.musicFolder, tracks: scanFolderForMp3(config.musicFolder) };
});

ipcMain.handle('get-track-metadata', async (_event, filePath) => {
  try {
    const { parseFile } = await import('music-metadata');
    const metadata = await parseFile(filePath);
    return {
      title: metadata.common.title || null,
      artist: metadata.common.artist || null,
      duration: metadata.format.duration || null,
    };
  } catch {
    return { title: null, artist: null, duration: null };
  }
});

ipcMain.handle('get-theme', async () => {
  const config = loadConfig();
  return config.theme || 'light';
});

ipcMain.handle('set-theme', async (_event, theme) => {
  const config = loadConfig();
  config.theme = theme;
  saveConfig(config);
});

ipcMain.handle('get-glow', async () => {
  const config = loadConfig();
  return config.glowEnabled !== false;
});

ipcMain.handle('set-glow', async (_event, enabled) => {
  const config = loadConfig();
  config.glowEnabled = enabled;
  saveConfig(config);
});
