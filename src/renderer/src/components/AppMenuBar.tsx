import { useEffect, useRef, useState } from 'react'

export interface AppMenuActions {
  onAddSource: () => void
  onStartQueue: () => void
  onStopQueue: () => void
  onClearDone: () => void
  onPreferences: () => void
  onDockAll: () => void
  onShowAllPanels: () => void
  canStart: boolean
  canStop: boolean
}

type MenuId = 'file' | 'edit' | 'view' | 'window' | 'help'

interface Item {
  label: string
  shortcut?: string
  disabled?: boolean
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
          action: () => void window.encodeThis.windowClose()
        }
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
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
          action: () => void window.encodeThis.windowMinimize()
        },
        {
          label: 'Maximize / Restore',
          action: () => void window.encodeThis.windowMaximizeToggle()
        },
        { separator: true, label: '' },
        {
          label: 'Close Window',
          action: () => void window.encodeThis.windowClose()
        }
      ]
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        {
          label: 'Encode This on GitHub',
          action: () => {
            void window.open('https://github.com/nuclearfessel/encode-this', '_blank')
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
                    key={item.label}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    className="app-menu-item"
                    onClick={() => {
                      setOpen(null)
                      item.action?.()
                    }}
                  >
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
