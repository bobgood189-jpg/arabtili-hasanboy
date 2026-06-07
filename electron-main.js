/* ============================================================
   electron-main.js — главный процесс Electron
   Оборачивает веб-приложение (index.html) в нативное окно.
   Запуск:  npm start
   Сборка:  npm run dist   (см. инструкцию)
   ============================================================ */
const { app, BrowserWindow, Menu, shell, nativeImage } = require('electron');
const path = require('path');

// Один экземпляр приложения (не плодим окна при повторном запуске)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, 'build', 'icon.png');
  let icon;
  try { icon = nativeImage.createFromPath(iconPath); } catch (_) { icon = undefined; }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: '#0d3d24',   // тёмно-зелёный фон, пока грузится UI
    title: 'عربي — Учи арабский',
    icon: icon && !icon.isEmpty() ? icon : undefined,
    autoHideMenuBar: true,        // меню скрыто (видно по Alt) — как у приложения
    show: false,                  // покажем после готовности, без «белой вспышки»
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  // Грузим локальный файл приложения (работает офлайн)
  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Внешние ссылки открываем в системном браузере, а не внутри приложения
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const current = mainWindow.webContents.getURL();
    if (url !== current) { e.preventDefault(); if (/^https?:\/\//i.test(url)) shell.openExternal(url); }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

/* ---------- Меню приложения (локализованное, минимальное) ---------- */
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: 'О приложении' },
        { type: 'separator' },
        { role: 'hide', label: 'Скрыть' },
        { role: 'hideOthers', label: 'Скрыть остальные' },
        { role: 'unhide', label: 'Показать все' },
        { type: 'separator' },
        { role: 'quit', label: 'Выйти' },
      ],
    }] : []),
    {
      label: 'Файл',
      submenu: [ isMac ? { role: 'close', label: 'Закрыть окно' } : { role: 'quit', label: 'Выйти' } ],
    },
    {
      label: 'Правка',
      submenu: [
        { role: 'undo', label: 'Отменить' },
        { role: 'redo', label: 'Повторить' },
        { type: 'separator' },
        { role: 'cut', label: 'Вырезать' },
        { role: 'copy', label: 'Копировать' },
        { role: 'paste', label: 'Вставить' },
        { role: 'selectAll', label: 'Выделить всё' },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload', label: 'Обновить' },
        { role: 'forceReload', label: 'Принудительно обновить' },
        { role: 'toggleDevTools', label: 'Инструменты разработчика' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Обычный размер' },
        { role: 'zoomIn', label: 'Увеличить' },
        { role: 'zoomOut', label: 'Уменьшить' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Полный экран' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ---------- Жизненный цикл ---------- */
app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
