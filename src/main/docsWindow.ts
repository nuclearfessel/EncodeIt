import { BrowserWindow, screen } from 'electron'
import path from 'path'

const DEFAULTS = { width: 920, height: 720, minWidth: 560, minHeight: 400 }

/**
 * Singleton resizable Documentation window (not a modal).
 */
export class DocsWindowManager {
  private win: BrowserWindow | null = null
  private preloadPath: string
  private getMainWindow: () => BrowserWindow | null

  constructor(options: {
    preloadPath: string
    getMainWindow: () => BrowserWindow | null
  }) {
    this.preloadPath = options.preloadPath
    this.getMainWindow = options.getMainWindow
  }

  open(): void {
    if (this.win && !this.win.isDestroyed()) {
      if (this.win.isMinimized()) this.win.restore()
      this.win.focus()
      return
    }

    const main = this.getMainWindow()
    const cursor = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(
      main && !main.isDestroyed()
        ? {
            x: main.getBounds().x + Math.floor(main.getBounds().width / 2),
            y: main.getBounds().y + Math.floor(main.getBounds().height / 2)
          }
        : cursor
    )

    let x = display.workArea.x + Math.floor((display.workArea.width - DEFAULTS.width) / 2)
    let y = display.workArea.y + Math.floor((display.workArea.height - DEFAULTS.height) / 2)
    if (main && !main.isDestroyed()) {
      const b = main.getBounds()
      x = Math.min(
        Math.max(display.workArea.x, b.x + Math.floor((b.width - DEFAULTS.width) / 2)),
        display.workArea.x + display.workArea.width - DEFAULTS.width
      )
      y = Math.min(
        Math.max(display.workArea.y, b.y + 48),
        display.workArea.y + display.workArea.height - DEFAULTS.height
      )
    }

    const win = new BrowserWindow({
      width: DEFAULTS.width,
      height: DEFAULTS.height,
      x,
      y,
      minWidth: DEFAULTS.minWidth,
      minHeight: DEFAULTS.minHeight,
      title: 'Documentation',
      backgroundColor: '#1a1a1a',
      frame: false,
      show: false,
      resizable: true,
      maximizable: true,
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    win.once('ready-to-show', () => {
      if (!win.isDestroyed()) win.show()
    })
    const emitWinState = () => {
      if (win.isDestroyed()) return
      win.webContents.send('window:state', { maximized: win.isMaximized() })
    }
    win.on('maximize', emitWinState)
    win.on('unmaximize', emitWinState)

    if (process.env.ELECTRON_RENDERER_URL) {
      void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}?docs=1`)
    } else {
      void win.loadFile(path.join(__dirname, '../renderer/index.html'), {
        query: { docs: '1' }
      })
    }

    win.on('closed', () => {
      this.win = null
    })

    this.win = win
  }

  dispose(): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.removeAllListeners('closed')
      this.win.close()
    }
    this.win = null
  }
}
