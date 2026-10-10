export type PanelId = 'media' | 'presets' | 'queue' | 'encoding'

export const PANEL_IDS: PanelId[] = ['media', 'presets', 'queue', 'encoding']

export const PANEL_TITLES: Record<PanelId, string> = {
  media: 'Media Browser',
  presets: 'Preset Browser',
  queue: 'Queue',
  encoding: 'Encoding'
}

export type { PanelPlacement, WorkspaceState, DockEdge, AnyDropTarget } from './workspaceLayout'
export { defaultWorkspace } from './workspaceLayout'

import type { PanelPlacement } from './workspaceLayout'

/** Placement map only (legacy helpers). */
export type DockState = Record<PanelId, PanelPlacement>

export function defaultDockState(): DockState {
  return {
    media: 'docked',
    presets: 'docked',
    queue: 'docked',
    encoding: 'docked'
  }
}

export function isPanelId(value: string | null | undefined): value is PanelId {
  return PANEL_IDS.includes(value as PanelId)
}
