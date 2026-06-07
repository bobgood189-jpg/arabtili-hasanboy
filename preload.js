/* ============================================================
   preload.js — безопасный мост между Electron и веб-страницей
   Работает при contextIsolation:true и sandbox:true.
   Веб-код видит только window.desktopApp (ничего из Node наружу).
   ============================================================ */
const { contextBridge } = require('electron');

let versions = {};
try {
  versions = {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  };
} catch (_) { /* в sandbox часть полей может быть недоступна */ }

contextBridge.exposeInMainWorld('desktopApp', {
  isDesktop: true,
  platform: (() => { try { return process.platform; } catch (_) { return 'unknown'; } })(),
  versions,
});
