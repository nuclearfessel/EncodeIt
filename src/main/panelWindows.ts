import { BrowserWindow, screen } from 'electron'
import path from 'path'
import { PANEL_TITLES, PANEL_IDS, type PanelId } from '../shared/panels'
import {
  applyDrop,
  defaultWorkspace,
  markClosed,
  markUndocked,
  type AnyDropTarget,
  type DockEdge,
  type WorkspaceState
} from '../shared/workspaceLayout'
import {
  cloneWorkspace,
  createNamedWorkspace,
  loadWorkspaceFile,
  saveWorkspaceFile,
  type NamedWorkspace,
  type WorkspaceFile
} from './workspaces'

const WINDOW_DEFAULTS: Record<PanelId, { width: number; height: number }> = {
  media: { width: 460, height: 720 },
  presets: { width: 460, height: 560 },
  queue: { width: 1000, height: 640 },
  encoding: { width: 520, height: 480 }
}

export interface PanelDragSession {
  panelId: PanelId
  /** True when drag started from a floating window. */
  fromFloating: boolean
}

export interface WorkspaceCatalog {
  current: WorkspaceState
  activeId: string | null
  activeName: string | null
  named: Array<{ id: string; name: string; updatedAt: number }>
}

export class PanelWindowManager {
  private windows = new Map<PanelId, BrowserWindow>()
  private workspace: WorkspaceState = defaultWorkspace()
  private store: WorkspaceFile
  private drag: PanelDragSession | null = null
  private onChange: (state: WorkspaceState) => void
  private onDrag: (session: PanelDragSession | null, target: AnyDropTarget | null) => void
  private onCatalogChange: (catalog: WorkspaceCatalog) => void
  private preloadPath: string
  private getMainWindow: () => BrowserWindow | null
  private activeTarget: AnyDropTarget | null = null
  private persistTimer: ReturnType<typeof setTimeout> | null = null
  private restoredFloats = false

  constructor(options: {
    preloadPath: string
    getMainWindow: () => BrowserWindow | null
    onChange: (state: WorkspaceState) => void
    onDrag: (session: PanelDragSession | null, target: AnyDropTarget | null) => void
    onCatalogChange?: (catalog: WorkspaceCatalog) => void
  }) {
    this.preloadPath = options.preloadPath
    this.getMainWindow = options.getMainWindow
    this.onChange = options.onChange
    this.onDrag = options.onDrag
    this.onCatalogChange = options.onCatalogChange ?? (() => undefined)
    this.store = loadWorkspaceFile()
    this.workspace = cloneWorkspace(this.store.current)
  }

  /** Call after the main window exists so undocked panels can open. */
  restoreFloatingPanels(): void {
    if (this.restoredFloats) return
    this.restoredFloats = true
    for (const id of PANEL_IDS) {
      if (this.workspace.placement[id] === 'undocked' && !this.windows.has(id)) {
        this.spawnFloat(id)
      }
    }
  }

  getWorkspace(): WorkspaceState {
    return cloneWorkspace(this.workspace)
  }

  getCatalog(): WorkspaceCatalog {
    const active = this.store.named.find((n) => n.id === this.store.activeId) ?? null
    return {
      current: this.getWorkspace(),
      activeId: this.store.activeId,
      activeName: active?.name ?? null,
      named: this.store.named.map((n) => ({
        id: n.id,
        name: n.name,
        updatedAt: n.updatedAt
      }))
    }
  }

  /** Update layout sizes without broadcasting (renderer-driven splitter drags). */
  setRootSilent(root: WorkspaceState['root']): void {
    this.workspace = { ...this.workspace, root }
    this.queuePersist()
  }

  /** Back-compat shape for older UI bits. */
  getState(): Record<PanelId, 'docked' | 'undocked' | 'closed'> {
    return { ...this.workspace.placement }
  }

  resetToDefault(): WorkspaceState {
    this.destroyAllFloats()
    this.workspace = defaultWorkspace()
    this.store.activeId = null
    this.emit(true)
    return this.getWorkspace()
  }

  resetToSaved(): WorkspaceState {
    const saved = this.store.named.find((n) => n.id === this.store.activeId)
    if (!saved) return this.resetToDefault()
    return this.applyNamed(saved)
  }

  saveAsNew(name: string): WorkspaceCatalog {
    const named = createNamedWorkspace(name, this.workspace)
    this.store.named = [...this.store.named, named]
    this.store.activeId = named.id
    this.persistNow()
    this.onCatalogChange(this.getCatalog())
    return this.getCatalog()
  }

  saveActive(): WorkspaceCatalog {
    const idx = this.store.named.findIndex((n) => n.id === this.store.activeId)
    if (idx < 0) return this.getCatalog()
    const prev = this.store.named[idx]
    this.store.named[idx] = {
      ...prev,
      state: cloneWorkspace(this.workspace),
      updatedAt: Date.now()
    }
    this.persistNow()
    this.onCatalogChange(this.getCatalog())
    return this.getCatalog()
  }

  switchTo(id: string | null): WorkspaceState {
    if (id == null) return this.resetToDefault()
    const named = this.store.named.find((n) => n.id === id)
    if (!named) return this.getWorkspace()
    return this.applyNamed(named)
  }

  renameNamed(id: string, name: string): WorkspaceCatalog {
    const trimmed = name.trim()
    if (!trimmed) return this.getCatalog()
    this.store.named = this.store.named.map((n) =>
      n.id === id ? { ...n, name: trimmed, updatedAt: Date.now() } : n
    )
    this.persistNow()
    this.onCatalogChange(this.getCatalog())
    return this.getCatalog()
  }

  deleteNamed(id: string): WorkspaceCatalog {
    this.store.named = this.store.named.filter((n) => n.id !== id)
    if (this.store.activeId === id) this.store.activeId = null
    this.persistNow()
    this.onCatalogChange(this.getCatalog())
    return this.getCatalog()
  }

  undock(id: PanelId): WorkspaceState {
    if (this.windows.has(id) && !this.windows.get(id)!.isDestroyed()) {
      this.windows.get(id)!.focus()
      return this.getWorkspace()
    }

    this.workspace = markUndocked(this.workspace, id)
    this.spawnFloat(id)
    this.emit()
    return this.getWorkspace()
  }

  dock(id: PanelId, edge: DockEdge = 'right'): WorkspaceState {
    this.destroyWindow(id)
    this.workspace = applyDrop(this.workspace, id, { kind: 'edge', edge })
    this.emit()
    this.getMainWindow()?.focus()
    return this.getWorkspace()
  }

  dockAt(id: PanelId, target: AnyDropTarget): WorkspaceState {
    this.destroyWindow(id)
    this.workspace = applyDrop(this.workspace, id, target)
    this.emit()
    this.getMainWindow()?.focus()
    return this.getWorkspace()
  }

  close(id: PanelId): WorkspaceState {
    this.destroyWindow(id)
    this.workspace = markClosed(this.workspace, id)
    this.emit()
    this.getMainWindow()?.focus()
    return this.getWorkspace()
  }

  togglePanel(id: PanelId): WorkspaceState {
    const placement = this.workspace.placement[id]
    if (placement === 'docked' || placement === 'undocked') {
      return this.close(id)
    }
    return this.dock(id, 'right')
  }

  dockAll(): WorkspaceState {
    for (const id of PANEL_IDS) {
      if (this.workspace.placement[id] === 'undocked') {
        this.destroyWindow(id)
        this.workspace = applyDrop(this.workspace, id, { kind: 'edge', edge: 'right' })
      }
    }
    this.emit()
    return this.getWorkspace()
  }

  showAll(): WorkspaceState {
    for (const id of PANEL_IDS) {
      if (this.workspace.placement[id] !== 'docked') {
        this.destroyWindow(id)
        this.workspace = applyDrop(this.workspace, id, { kind: 'edge', edge: 'right' })
      }
    }
    this.emit()
    return this.getWorkspace()
  }

  beginDrag(id: PanelId, fromFloating: boolean): void {
    this.drag = { panelId: id, fromFloating }
    this.activeTarget = null
    this.onDrag(this.drag, null)
  }

  updateDragTarget(target: AnyDropTarget | null): void {
    if (!this.drag) return
    this.activeTarget = target
    this.onDrag(this.drag, target)
  }

  endDrag(action: 'dock' | 'undock' | 'cancel'): WorkspaceState {
    const session = this.drag
    const target = this.activeTarget
    this.drag = null
    this.activeTarget = null
    this.onDrag(null, null)

    if (!session) return this.getWorkspace()

    if (action === 'dock' && target) {
      return this.dockAt(session.panelId, target)
    }

    if (action === 'undock' && this.workspace.placement[session.panelId] === 'docked') {
      return this.undock(session.panelId)
    }

    return this.getWorkspace()
  }

  getDragSession(): PanelDragSession | null {
    return this.drag
  }

  /** Screen-point helper for floating-window drags over the main workspace. */
  hitTestMainWindow(): {
    overMain: boolean
    relX: number
    relY: number
    width: number
    height: number
  } {
    const main = this.getMainWindow()
    const cursor = screen.getCursorScreenPoint()
    if (!main || main.isDestroyed()) {
      return { overMain: false, relX: 0, relY: 0, width: 0, height: 0 }
    }
    const bounds = main.getContentBounds()
    const overMain =
      cursor.x >= bounds.x &&
      cursor.x <= bounds.x + bounds.width &&
      cursor.y >= bounds.y &&
      cursor.y <= bounds.y + bounds.height
    return {
      overMain,
      relX: cursor.x - bounds.x,
      relY: cursor.y - bounds.y,
      width: bounds.width,
      height: bounds.height
    }
  }

  dispose(): void {
    this.drag = null
    if (this.persistTimer) {
      clearTimeout(this.persistTimer)
      this.persistTimer = null
    }
    this.persistNow()
    for (const id of [...this.windows.keys()]) this.destroyWindow(id)
  }

  private applyNamed(named: NamedWorkspace): WorkspaceState {
    this.destroyAllFloats()
    this.workspace = cloneWorkspace(named.state)
    this.store.activeId = named.id
    for (const id of PANEL_IDS) {
      if (this.workspace.placement[id] === 'undocked') this.spawnFloat(id)
    }
    this.emit(true)
    return this.getWorkspace()
  }

  private destroyAllFloats(): void {
    for (const id of PANEL_IDS) this.destroyWindow(id)
  }

  private spawnFloat(id: PanelId): void {
    const defaults = WINDOW_DEFAULTS[id]
    const cursor = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursor)
    const x = Math.min(
      Math.max(display.workArea.x, cursor.x - 40),
      display.workArea.x + display.workArea.width - defaults.width
    )
    const y = Math.min(
      Math.max(display.workArea.y, cursor.y - 16),
      display.workArea.y + display.workArea.height - defaults.height
    )

    const win = new BrowserWindow({
      width: defaults.width,
      height: defaults.height,
      x,
      y,
      minWidth: 320,
      minHeight: 240,
      title: PANEL_TITLES[id],
      backgroundColor: '#1a1a1a',
      frame: false,
      show: false,
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

    const query = `undocked=${id}`
    if (process.env.ELECTRON_RENDERER_URL) {
      void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}?${query}`)
    } else {
      void win.loadFile(path.join(__dirname, '../renderer/index.html'), {
        query: { undocked: id }
      })
    }

    win.on('closed', () => {
      this.windows.delete(id)
      if (this.workspace.placement[id] === 'undocked') {
        this.workspace = markClosed(this.workspace, id)
        this.emit()
      }
    })

    this.windows.set(id, win)
  }

  private destroyWindow(id: PanelId): void {
    const win = this.windows.get(id)
    if (win && !win.isDestroyed()) {
      win.removeAllListeners('closed')
      win.close()
    }
    this.windows.delete(id)
  }

  private queuePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer)
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      this.persistNow()
    }, 250)
  }

  private persistNow(): void {
    this.store.current = cloneWorkspace(this.workspace)
    saveWorkspaceFile(this.store)
  }

  private emit(catalogToo = false): void {
    this.queuePersist()
    this.onChange(this.getWorkspace())
    if (catalogToo) this.onCatalogChange(this.getCatalog())
  }
}
