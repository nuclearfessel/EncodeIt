import { useEffect, useRef, useState } from 'react'
import { PANEL_IDS, PANEL_TITLES, type PanelId } from '../../../shared/panels'
import type { PanelPlacement } from '../../../shared/workspaceLayout'

export interface WorkspaceMenuInfo {
  activeId: string | null
  activeName: string | null
  named: Array<{ id: string; name: string }>
}

export interface AppMenuActions {
  onAddSource: () => void
  onStartQueue: () => void
  onStopQueue: () => void
  onClearDone: () => void
  onPreferences: () => void
  onExportSettings: () => void
  canExportSettings: boolean
  onDockAll: () => void
  onShowAllPanels: () => void
  onTogglePanel: (id: PanelId) => void
  panelPlacement: Record<PanelId, PanelPlacement>
  workspace: WorkspaceMenuInfo
  onNewWorkspace: () => void
  onSaveWorkspace: () => void
  onSwitchWorkspace: (id: string | null) => void
  onResetWorkspaceSaved: () => void
  onResetWorkspaceDefault: () => void
  onDeleteWorkspace: (id: string) => void
  onDocumentation: () => void
  onAbout: () => void
  onOpenLog: () => void
  canStart: boolean
  canStop: boolean
}

type MenuId = 'file' | 'edit' | 'view' | 'window' | 'help'

interface Item {
  label: string
  shortcut?: string
  disabled?: boolean
  checked?: boolean
  separator?: boolean
  action?: () => void
}

interface Props {
  actions: AppMenuActions
}

export function AppMenuBar({ actions }: Props) {
  const [open, setOpen] = useState<MenuId | null>(null)
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const workspaceItems: Item[] = [
    {
      label: 'Default',
      checked: actions.workspace.activeId == null,
      action: () => actions.onSwitchWorkspace(null)
    },
    ...actions.workspace.named.map((ws) => ({
      label: ws.name,
      checked: actions.workspace.activeId === ws.id,
      action: () => actions.onSwitchWorkspace(ws.id)
    })),
    { separator: true, label: '' },
    { label: 'New Workspace…', action: actions.onNewWorkspace },
    {
      label: 'Save Changes to this Workspace',
      disabled: !actions.workspace.activeId,
      action: actions.onSaveWorkspace
    },
    {
      label: 'Reset to Saved Layout',
      disabled: !actions.workspace.activeId,
      action: actions.onResetWorkspaceSaved
    },
    { label: 'Reset to Default Layout', action: actions.onResetWorkspaceDefault },
    ...(actions.workspace.activeId
      ? [
          { separator: true, label: '' },
          {
            label: `Delete “${actions.workspace.activeName ?? 'Workspace'}”`,
            action: () => {
              if (actions.workspace.activeId) {
                actions.onDeleteWorkspace(actions.workspace.activeId)
              }
            }
          }
        ]
      : [])
  ]

  const menus: { id: MenuId; label: string; items: Item[] }[] = [
    {
      id: 'file',
      label: 'File',
      items: [
        { label: 'Add Source…', shortcut: 'Ctrl+O', action: actions.onAddSource },
        { separator: true, label: '' },
        {
          label: 'Start Queue',
          shortcut: 'Ctrl+Enter',
          disabled: !actions.canStart,
          action: actions.onStartQueue
        },
        {
          label: 'Stop Queue',
          shortcut: 'Ctrl+.',
          disabled: !actions.canStop,
          action: actions.onStopQueue
        },
        { separator: true, label: '' },
        { label: 'Clear Done', action: actions.onClearDone },
        { separator: true, label: '' },
        {
          label: 'Quit',
          shortcut: 'Alt+F4',
          action: () => void window.EncodeIt.windowClose()
        }
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        {
          label: 'Export Settings…',
          disabled: !actions.canExportSettings,
          action: actions.onExportSettings
        },
        { separator: true, label: '' },
        {
          label: 'Preferences…',
          shortcut: 'Ctrl+,',
          action: actions.onPreferences
        }
      ]
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { label: 'Dock All Panels', action: actions.onDockAll },
        { label: 'Show All Panels', action: actions.onShowAllPanels }
      ]
    },
    {
      id: 'window',
      label: 'Window',
      items: [
        {
          label: 'Minimize',
          action: () => void window.EncodeIt.windowMinimize()
        },
        {
          label: 'Maximize / Restore',
          action: () => void window.EncodeIt.windowMaximizeToggle()
        },
        { separator: true, label: '' },
        ...PANEL_IDS.map((id) => ({
          label: PANEL_TITLES[id],
          checked: actions.panelPlacement[id] !== 'closed',
          action: () => actions.onTogglePanel(id)
        })),
        { separator: true, label: '' },
        ...workspaceItems,
        { separator: true, label: '' },
        {
          label: 'Close Window',
          action: () => void window.EncodeIt.windowClose()
        }
      ]
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        {
          label: 'Documentation',
          shortcut: 'F1',
          action: actions.onDocumentation
        },
        { label: 'Open Log File', action: actions.onOpenLog },
        { label: 'About EncodeIt', action: actions.onAbout },
        { separator: true, label: '' },
        {
          label: 'EncodeIt on GitHub',
          action: () => {
            void window.open('https://github.com/nuclearfessel/encodeit', '_blank')
          }
        }
      ]
    }
  ]

  return (
    <nav className="app-menubar" ref={rootRef} aria-label="Application">
      {menus.map((menu) => (
        <div key={menu.id} className={`app-menu ${open === menu.id ? 'is-open' : ''}`}>
          <button
            type="button"
            className="app-menu-trigger"
            aria-haspopup="menu"
            aria-expanded={open === menu.id}
            onClick={() => setOpen((v) => (v === menu.id ? null : menu.id))}
            onMouseEnter={() => {
              if (open) setOpen(menu.id)
            }}
          >
            {menu.label}
          </button>
          {open === menu.id ? (
            <div className="app-menu-pop" role="menu">
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div key={`sep-${i}`} className="app-menu-sep" role="separator" />
                ) : (
                  <button
                    key={`${menu.id}-${item.label}-${i}`}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={item.checked}
                    disabled={item.disabled}
                    className="app-menu-item"
                    onClick={() => {
                      setOpen(null)
                      item.action?.()
                    }}
                  >
                    <span className="app-menu-check" aria-hidden="true">
                      {item.checked ? '✓' : ''}
                    </span>
                    <span className="app-menu-label">{item.label}</span>
                    <span className="app-menu-shortcut">{item.shortcut ?? ''}</span>
                  </button>
                )
              )}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  )
}
