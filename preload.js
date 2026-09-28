const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('musicAPI', {
  pickMusicFolder: () => ipcRenderer.invoke('pick-music-folder'),
  getSavedFolder: () => ipcRenderer.invoke('get-saved-folder'),
  getTrackMetadata: (filePath) => ipcRenderer.invoke('get-track-metadata', filePath),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  getGlow: () => ipcRenderer.invoke('get-glow'),
  setGlow: (enabled) => ipcRenderer.invoke('set-glow', enabled),
});
