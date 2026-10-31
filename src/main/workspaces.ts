import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { PANEL_IDS, type PanelId } from '../shared/panels'
import {
  cloneLayout,
  collectDocked,
  defaultWorkspace,
  type LayoutNode,
  type PanelPlacement,
  type WorkspaceState
} from '../shared/workspaceLayout'

export interface NamedWorkspace {
  id: string
  name: string
  state: WorkspaceState
  updatedAt: number
}

export interface WorkspaceFile {
  version: 1
  /** Last live layout (restored on launch). */
  current: WorkspaceState
  /** Named workspace currently selected, if any. */
  activeId: string | null
  named: NamedWorkspace[]
}

function storePath(): string {
  return path.join(app.getPath('userData'), 'workspaces.json')
}

function isPanelId(value: unknown): value is PanelId {
  return typeof value === 'string' && PANEL_IDS.includes(value as PanelId)
}

function sanitizeNode(node: unknown): LayoutNode | null {
  if (!node || typeof node !== 'object') return null
  const n = node as { type?: string; id?: unknown; dir?: unknown; children?: unknown }
  if (n.type === 'panel' && isPanelId(n.id)) return { type: 'panel', id: n.id }
  if (n.type === 'split' && (n.dir === 'row' || n.dir === 'col') && Array.isArray(n.children)) {
    const children = n.children
      .map((c) => {
        if (!c || typeof c !== 'object') return null
        const child = c as { size?: unknown; node?: unknown }
        const nested = sanitizeNode(child.node)
        if (!nested) return null
        const size = typeof child.size === 'number' && child.size > 0 ? child.size : 50
        return { size, node: nested }
      })
      .filter(Boolean) as { size: number; node: LayoutNode }[]
    if (!children.length) return null
    return { type: 'split', dir: n.dir, children }
  }
  return null
}

function sanitizeState(raw: unknown): WorkspaceState {
  const fallback = defaultWorkspace()
  if (!raw || typeof raw !== 'object') return fallback
  const r = raw as { root?: unknown; placement?: unknown }
  const root = sanitizeNode(r.root)
  const placement: Record<PanelId, PanelPlacement> = { ...fallback.placement }
  if (r.placement && typeof r.placement === 'object') {
    for (const id of PANEL_IDS) {
      const p = (r.placement as Record<string, unknown>)[id]
      if (p === 'docked' || p === 'undocked' || p === 'closed') placement[id] = p
    }
  }
  // Keep placement consistent with tree for docked panels
  if (root) {
    const docked = new Set(collectDocked(root))
    for (const id of PANEL_IDS) {
      if (docked.has(id)) placement[id] = 'docked'
      else if (placement[id] === 'docked') placement[id] = 'closed'
    }
  } else {
    for (const id of PANEL_IDS) {
      if (placement[id] === 'docked') placement[id] = 'closed'
    }
  }
  return { root, placement }
}

function sanitizeNamed(raw: unknown): NamedWorkspace[] {
  if (!Array.isArray(raw)) return []
  const out: NamedWorkspace[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const n = item as Partial<NamedWorkspace>
    if (typeof n.id !== 'string' || typeof n.name !== 'string' || !n.name.trim()) continue
    out.push({
      id: n.id,
      name: n.name.trim(),
      state: sanitizeState(n.state),
      updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : Date.now()
    })
  }
  return out
}

export function cloneWorkspace(state: WorkspaceState): WorkspaceState {
  return {
    root: cloneLayout(state.root),
    placement: { ...state.placement }
  }
}

export function loadWorkspaceFile(): WorkspaceFile {
  try {
    const file = storePath()
    if (!fs.existsSync(file)) {
      const current = defaultWorkspace()
      return { version: 1, current, activeId: null, named: [] }
    }
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<WorkspaceFile>
    const named = sanitizeNamed(parsed.named)
    const activeId =
      typeof parsed.activeId === 'string' && named.some((n) => n.id === parsed.activeId)
        ? parsed.activeId
        : null
    return {
      version: 1,
      current: sanitizeState(parsed.current),
      activeId,
      named
    }
  } catch {
    return { version: 1, current: defaultWorkspace(), activeId: null, named: [] }
  }
}

export function saveWorkspaceFile(data: WorkspaceFile): void {
  const file = storePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

export function createNamedWorkspace(name: string, state: WorkspaceState): NamedWorkspace {
  return {
    id: `ws-${uuid().slice(0, 8)}`,
    name: name.trim() || 'Workspace',
    state: cloneWorkspace(state),
    updatedAt: Date.now()
  }
}
