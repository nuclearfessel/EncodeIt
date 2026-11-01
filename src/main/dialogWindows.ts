import { BrowserWindow, screen } from 'electron'
import path from 'path'
import type { ThemeMode } from '../shared/types'
import { loadAppIcon } from './appIcon'

type DialogKind = 'prefs' | 'exportSettings'

const PREFS = { width: 720, height: 560, minWidth: 560, minHeight: 420 }
const EXPORT = { width: 640, height: 680, minWidth: 520, minHeight: 480 }

const WINDOW_BG = { light: '#eceef1', dark: '#171a1d' } as const

function resolveTheme(mode: ThemeMode | undefined, systemDark: boolean): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode
  return systemDark ? 'dark' : 'light'
}

/**
 * Floating Preferences / Export Settings windows (non-modal BrowserWindows).
 */
export class DialogWindowManager {
  private prefsWin: BrowserWindow | null = null
  private exportWin: BrowserWindow | null = null
  private preloadPath: string
  private getMainWindow: () => BrowserWindow | null
  private getThemeMode: () => ThemeMode
  private systemDark: () => boolean

  constructor(options: {
    preloadPath: string
    getMainWindow: () => BrowserWindow | null
    getThemeMode: () => ThemeMode
    systemDark: () => boolean
  }) {
    this.preloadPath = options.preloadPath
    this.getMainWindow = options.getMainWindow
    this.getThemeMode = options.getThemeMode
    this.systemDark = options.systemDark
  }

  openPreferences(): void {
    this.open('prefs')
  }

  openExportSettings(jobIds?: string[]): void {
    this.open('exportSettings', jobIds)
  }

  setBackgroundColor(themeMode?: ThemeMode): void {
    const bg = WINDOW_BG[resolveTheme(themeMode ?? this.getThemeMode(), this.systemDark())]
    for (const win of [this.prefsWin, this.exportWin]) {
      if (win && !win.isDestroyed()) win.setBackgroundColor(bg)
    }
  }

  dispose(): void {
    for (const win of [this.prefsWin, this.exportWin]) {
      if (win && !win.isDestroyed()) {
        win.removeAllListeners('closed')
        win.close()
      }
    }
    this.prefsWin = null
    this.exportWin = null
  }

  private open(kind: DialogKind, jobIds?: string[]): void {
    const existing = kind === 'prefs' ? this.prefsWin : this.exportWin
    const query = this.queryFor(kind, jobIds)

    if (existing && !existing.isDestroyed()) {
      if (kind === 'exportSettings') {
        void this.load(existing, query)
      }
      if (existing.isMinimized()) existing.restore()
      existing.focus()
      return
    }

    const size = kind === 'prefs' ? PREFS : EXPORT
    const { x, y } = this.place(size.width, size.height)
    const bg = WINDOW_BG[resolveTheme(this.getThemeMode(), this.systemDark())]
    const title = kind === 'prefs' ? 'Preferences' : 'Export Settings'

    const icon = loadAppIcon()
    const win = new BrowserWindow({
      width: size.width,
      height: size.height,
      x,
      y,
      minWidth: size.minWidth,
      minHeight: size.minHeight,
      title,
      backgroundColor: bg,
      frame: false,
      show: false,
      resizable: true,
      maximizable: true,
      ...(icon ? { icon } : {}),
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

    void this.load(win, query)

    win.on('closed', () => {
      if (kind === 'prefs') this.prefsWin = null
      else this.exportWin = null
    })

    if (kind === 'prefs') this.prefsWin = win
    else this.exportWin = win
  }

  private queryFor(kind: DialogKind, jobIds?: string[]): Record<string, string> {
    if (kind === 'prefs') return { prefs: '1' }
    const q: Record<string, string> = { exportSettings: '1' }
    if (jobIds?.length) q.jobs = jobIds.join(',')
    return q
  }

  private async load(win: BrowserWindow, query: Record<string, string>): Promise<void> {
    if (process.env.ELECTRON_RENDERER_URL) {
      const url = new URL(process.env.ELECTRON_RENDERER_URL)
      for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
      await win.loadURL(url.toString())
      return
    }
    await win.loadFile(path.join(__dirname, '../renderer/index.html'), { query })
  }

  private place(width: number, height: number): { x: number; y: number } {
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

    let x = display.workArea.x + Math.floor((display.workArea.width - width) / 2)
    let y = display.workArea.y + Math.floor((display.workArea.height - height) / 2)
    if (main && !main.isDestroyed()) {
      const b = main.getBounds()
      x = Math.min(
        Math.max(display.workArea.x, b.x + Math.floor((b.width - width) / 2)),
        display.workArea.x + display.workArea.width - width
      )
      y = Math.min(
        Math.max(display.workArea.y, b.y + 48),
        display.workArea.y + display.workArea.height - height
      )
    }
    return { x, y }
  }
}
