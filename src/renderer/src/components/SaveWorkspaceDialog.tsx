import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  initialName?: string
  title?: string
  confirmLabel?: string
  onClose: () => void
  onSave: (name: string) => void | Promise<void>
}

export function SaveWorkspaceDialog({
  open,
  initialName = 'My Workspace',
  title = 'New Workspace',
  confirmLabel = 'OK',
  onClose,
  onSave
}: Props) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setError(null)
    setSaving(false)
  }, [open, initialName])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a workspace name')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(trimmed)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="about-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="about-dialog ws-save-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ws-save-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="about-header">
          <h2 id="ws-save-title">{title}</h2>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="about-body">
          <label className="ws-save-field">
            <span>Name</span>
            <input
              autoFocus
              value={name}
              disabled={saving}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit()
              }}
            />
          </label>
          {error ? <p className="ex-error">{error}</p> : null}
        </div>
        <footer className="about-footer">
          <button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="primary" disabled={saving} onClick={() => void submit()}>
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
