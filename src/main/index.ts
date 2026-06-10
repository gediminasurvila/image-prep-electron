/**
 * Electron main entry. Creates a secure BrowserWindow and registers IPC.
 *
 * Security posture (see spec):
 *   - contextIsolation: true
 *   - nodeIntegration: false
 *   - sandbox: true (the preload is a CommonJS bundle using only contextBridge /
 *     ipcRenderer / webUtils, all available inside the OS sandbox)
 *   - only a minimal, validated API is exposed via the preload script
 *
 * Sharp/libvips is NOT loaded here — all image work runs in forked worker
 * processes (see sharpClient.ts) to keep this process's glib clean for the GUI.
 */
import { app, BrowserWindow, Menu, shell } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { registerIpcHandlers } from './ipc'
import { shutdownWorkers } from './sharpClient'

// Remove the default application menu (File / Edit / View / Help). On Windows
// and Linux this drops the window menu bar entirely; on macOS the system app
// menu remains (the OS requires it) but is reduced to the minimal default.
Menu.setApplicationMenu(null)

const isDev = !app.isPackaged

/**
 * On Linux the running window's taskbar icon is not derived from the build icon
 * automatically (unlike Windows' embedded .ico and macOS' .icns bundle icon), so
 * we point BrowserWindow at a PNG. In packaged builds it is copied to the
 * resources dir via electron-builder `extraResources`; in dev it lives at
 * build/icon.png in the project root. Returns undefined on Windows/macOS, which
 * use their platform icon.
 */
function linuxWindowIcon(): string | undefined {
  if (process.platform !== 'linux') return undefined
  const candidate = app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../build/icon.png')
  return existsSync(candidate) ? candidate : undefined
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#181b27',
    title: 'ImagePrep',
    icon: linuxWindowIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win.show())

  // Open external links in the default browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // electron-vite injects ELECTRON_RENDERER_URL during `dev`.
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  shutdownWorkers()
})
