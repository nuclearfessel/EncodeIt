import type { PanelId } from '../../shared/panels'
import {
  hitTestOuterEdge,
  hitTestPanelEdge,
  type AnyDropTarget
} from '../../shared/workspaceLayout'

/**
 * Resolve Drop target under a point in the main workspace.
 * Prefers panel-edge (beside) targets, then outer workspace edges.
 */
export function resolveDropTarget(
  clientX: number,
  clientY: number,
  workspaceEl: HTMLElement,
  draggingId: PanelId
): AnyDropTarget | null {
  const ws = workspaceEl.getBoundingClientRect()
  const x = clientX - ws.left
  const y = clientY - ws.top
  if (x < -8 || y < -8 || x > ws.width + 8 || y > ws.height + 8) return null

  const panels = workspaceEl.querySelectorAll<HTMLElement>('[data-panel-id]')
  let bestBeside: AnyDropTarget | null = null
  let bestDist = Infinity

  for (const el of panels) {
    const id = el.dataset.panelId as PanelId | undefined
    if (!id || id === draggingId) continue
    const r = el.getBoundingClientRect()
    const hit = hitTestPanelEdge(
      clientX,
      clientY,
      {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height
      },
      id,
      40
    )
    if (!hit) continue
    const lx = clientX - r.left
    const ly = clientY - r.top
    const dist = Math.min(lx, r.width - lx, ly, r.height - ly)
    if (dist < bestDist) {
      bestDist = dist
      bestBeside = hit
    }
  }

  if (bestBeside) return bestBeside

  return hitTestOuterEdge(x, y, ws.width, ws.height, 56)
}
