import { useEffect, useState } from 'react'
import type { AnyDropTarget } from '../../../shared/workspaceLayout'

interface Props {
  active: boolean
  target: AnyDropTarget | null
  draggingId?: string | null
}

interface BesideBox {
  left: number
  top: number
  width: number
  height: number
  edge: 'left' | 'right' | 'top' | 'bottom'
}

/**
 * Docking guides: outer edge bands + panel-edge highlight.
 */
export function DockDropOverlay({ active, target }: Props) {
  const [beside, setBeside] = useState<BesideBox | null>(null)

  useEffect(() => {
    if (!active || target?.kind !== 'beside') {
      setBeside(null)
      return
    }
    const workspace = document.querySelector<HTMLElement>('.app-workspace')
    const el = workspace?.querySelector<HTMLElement>(`[data-panel-id="${target.beside}"]`)
    if (!workspace || !el) {
      setBeside(null)
      return
    }
    const ws = workspace.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    setBeside({
      left: r.left - ws.left,
      top: r.top - ws.top,
      width: r.width,
      height: r.height,
      edge: target.edge
    })
  }, [active, target])

  if (!active) return null

  const edge = target?.kind === 'edge' ? target.edge : null

  return (
    <div className="dock-overlay" aria-hidden="true">
      <div className={`dock-band dock-band-left ${edge === 'left' ? 'hot' : ''}`} />
      <div className={`dock-band dock-band-right ${edge === 'right' ? 'hot' : ''}`} />
      <div className={`dock-band dock-band-top ${edge === 'top' ? 'hot' : ''}`} />
      <div className={`dock-band dock-band-bottom ${edge === 'bottom' ? 'hot' : ''}`} />
      {beside ? (
        <div
          className={`dock-beside dock-beside-${beside.edge}${target?.kind === 'beside' ? ' hot' : ''}`}
          style={{
            left: beside.left,
            top: beside.top,
            width: beside.width,
            height: beside.height
          }}
        />
      ) : null}
    </div>
  )
}
