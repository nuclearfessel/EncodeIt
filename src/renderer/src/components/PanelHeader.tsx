import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { PanelId } from '../../../shared/panels'
import type { DockEdge } from '../../../shared/workspaceLayout'
import { hitTestOuterEdge } from '../../../shared/workspaceLayout'
import { resolveDropTarget } from '../dockHitTest'
import { GripVertical, Menu, iconSize } from './icons'

interface Props {
  title: string
  panelId: PanelId
  /** This window is a floating undocked panel. */
  floating?: boolean
}

const EDGES: { edge: DockEdge; label: string }[] = [
  { edge: 'left', label: 'Dock Left' },
  { edge: 'right', label: 'Dock Right' },
  { edge: 'top', label: 'Dock Top' },
  { edge: 'bottom', label: 'Dock Bottom' }
]

/**
 * Panel chrome: grip + title + hamburger.
 * Drag to tear off / retarget drop zones; menu offers Close and Dock sides.
 */
export function PanelHeader({ title, panelId, floating }: Props) {
  const [open, setOpen] = useState(false)
  const [dockOpen, setDockOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    x: number
    y: number
    armed: boolean
    dragging: boolean
    pointerId: number
  } | null>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setDockOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  async function updateTargetFromPoint(clientX: number, clientY: number) {
    if (floating) {
      const hit = await window.EncodeIt.hitTestMainWindow()
      if (!hit.overMain) {
        await window.EncodeIt.setPanelDragTarget(null)
        return
      }
      // Menubar (30) + toolbar (~42) above the workspace.
      const toolbar = 72
      const y = hit.relY - toolbar
      const h = Math.max(0, hit.height - toolbar)
      const target = hitTestOuterEdge(hit.relX, y, hit.width, h, 64)
      await window.EncodeIt.setPanelDragTarget(target)
      return
    }

    const workspace = document.querySelector<HTMLElement>('.app-workspace')
    if (!workspace) {
      await window.EncodeIt.setPanelDragTarget(null)
      return
    }
    const target = resolveDropTarget(clientX, clientY, workspace, panelId)
    await window.EncodeIt.setPanelDragTarget(target)
  }

  function onPointerDown(e: ReactPointerEvent) {
    if ((e.target as HTMLElement).closest('button, a, input, select, label, .panel-menu-pop')) {
      return
    }
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      armed: true,
      dragging: false,
      pointerId: e.pointerId
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  async function onPointerMove(e: ReactPointerEvent) {
    const drag = dragRef.current
    if (!drag?.armed) return
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    if (!drag.dragging && Math.hypot(dx, dy) > 8) {
      drag.dragging = true
      setOpen(false)
      await window.EncodeIt.beginPanelDrag(panelId, Boolean(floating))
    }
    if (drag.dragging) {
      await updateTargetFromPoint(e.clientX, e.clientY)
    }
  }

  async function onPointerUp(e: ReactPointerEvent) {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag?.dragging) return
    try {
      await updateTargetFromPoint(e.clientX, e.clientY)

      if (floating) {
        const hit = await window.EncodeIt.hitTestMainWindow()
        if (!hit.overMain) {
          await window.EncodeIt.endPanelDrag('cancel')
          return
        }
        const toolbar = 72
        const target = hitTestOuterEdge(
          hit.relX,
          hit.relY - toolbar,
          hit.width,
          Math.max(0, hit.height - toolbar),
          64
        )
        await window.EncodeIt.setPanelDragTarget(target)
        await window.EncodeIt.endPanelDrag(target ? 'dock' : 'cancel')
        return
      }

      const workspace = document.querySelector<HTMLElement>('.app-workspace')
      if (!workspace) {
        await window.EncodeIt.endPanelDrag('undock')
        return
      }
      const ws = workspace.getBoundingClientRect()
      const inside =
        e.clientX >= ws.left &&
        e.clientX <= ws.right &&
        e.clientY >= ws.top &&
        e.clientY <= ws.bottom
      const target = resolveDropTarget(e.clientX, e.clientY, workspace, panelId)
      await window.EncodeIt.setPanelDragTarget(target)
      if (target) await window.EncodeIt.endPanelDrag('dock')
      else if (!inside) await window.EncodeIt.endPanelDrag('undock')
      else await window.EncodeIt.endPanelDrag('cancel')
    } catch {
      await window.EncodeIt.endPanelDrag('cancel')
    }
  }

  return (
    <div
      className={`panel-header panel-header-bar ${floating ? 'is-floating' : 'is-docked'}`}
      ref={rootRef}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => void onPointerMove(e)}
      onPointerUp={(e) => void onPointerUp(e)}
      onPointerCancel={(e) => void onPointerUp(e)}
      title={floating ? 'Drag onto the main window edges to dock' : 'Drag to tear off or redock'}
    >
      <div className="panel-header-left">
        <span className="panel-grip" aria-hidden="true">
          <GripVertical size={iconSize.sm} strokeWidth={2} />
        </span>
        <span className="panel-header-title">{title}</span>
        <div className="panel-menu">
          <button
            type="button"
            className="panel-header-btn panel-hamburger"
            aria-haspopup="menu"
            aria-expanded={open}
            title="Panel options"
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
              setDockOpen(false)
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Menu size={iconSize.sm} strokeWidth={2} />
          </button>
          {open ? (
            <div className="panel-menu-pop" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  void window.EncodeIt.closePanel(panelId)
                }}
              >
                Close Panel
              </button>
              {floating ? (
                <div className="panel-menu-sub">
                  <button
                    type="button"
                    role="menuitem"
                    className="panel-menu-subtrigger"
                    onClick={() => setDockOpen((v) => !v)}
                  >
                    Dock Panel ▸
                  </button>
                  {dockOpen ? (
                    <div className="panel-menu-submenu">
                      {EDGES.map(({ edge, label }) => (
                        <button
                          key={edge}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpen(false)
                            setDockOpen(false)
                            void window.EncodeIt.dockPanel(panelId, edge)
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false)
                    void window.EncodeIt.undockPanel(panelId)
                  }}
                >
                  Undock Panel
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
