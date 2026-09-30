const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

app.setPath('userData', path.join(app.getPath('appData'), 'ARENA-Manager'));
const gameURL = pathToFileURL(path.join(__dirname, '../dist/index.html')).href;
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 940, minWidth: 1080, minHeight: 720,
    title: 'ARENA — 검투 구단 매니저', backgroundColor: '#11191d',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== gameURL) event.preventDefault();
  });
  mainWindow.webContents.session.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ title: '게임 저장 파일 내보내기',
      defaultPath: path.join(app.getPath('documents'), item.getFilename()),
      filters: [{ name: 'ARENA 저장 파일', extensions: ['json'] }] });
  });
  mainWindow.loadURL(gameURL);
  mainWindow.on('closed', () => { mainWindow = null; });
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: '게임', submenu: [{ role: 'quit', label: '종료' }] },
      { label: '화면', submenu: [{ role: 'togglefullscreen', label: '전체 화면' },
        { role: 'resetZoom', label: '기본 크기' }, { role: 'zoomIn', label: '확대' }, { role: 'zoomOut', label: '축소' }] },
      { label: '도움말', submenu: [{ label: '게임 정보', click: () => dialog.showMessageBox(mainWindow, {
        type: 'info', title: 'ARENA Manager', message: `ARENA Manager ${app.getVersion()}`,
        detail: '오프라인 싱글플레이 검투 구단 매니저\n저장 파일은 이 컴퓨터에 보관됩니다. 업데이트 전 저장 파일 내보내기로 백업할 수 있습니다.'
      }) }] }
    ]));
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
