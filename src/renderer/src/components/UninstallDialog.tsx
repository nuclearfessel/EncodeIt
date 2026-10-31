import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

export function UninstallDialog({ open, onClose }: Props) {
  const [keepMedia, setKeepMedia] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failures, setFailures] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setKeepMedia(false)
    setBusy(false)
    setError(null)
    setFailures([])
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      const result = await window.EncodeIt.uninstallCleanup(keepMedia)
      if (result.failed.length) {
        setFailures(result.failed.map((f) => `${f.path}: ${f.error}`))
      }
      await window.EncodeIt.quitAfterCleanup()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="about-backdrop" role="presentation" onMouseDown={() => !busy && onClose()}>
      <div
        className="about-dialog uninstall-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="uninstall-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="about-header">
          <h2 id="uninstall-title">Uninstall EncodeIt</h2>
          <button type="button" className="icon-btn" title="Close" disabled={busy} onClick={onClose}>
            ×
          </button>
        </header>
        <div className="about-body">
          <p>
            This removes EncodeIt settings, logs, workspaces, custom presets, CEP panels, and known
            After Effects / Premiere / Resolve scripts so the next install is clean.
          </p>
          <p>
            On Windows, also remove the app from <strong>Settings → Apps</strong> (or run the
            installer&apos;s Uninstall) to delete Program Files. On macOS, drag EncodeIt out of
            Applications if you installed from a DMG.
          </p>
          <label className="uninstall-check">
            <input
              type="checkbox"
              checked={keepMedia}
              disabled={busy}
              onChange={(e) => setKeepMedia(e.target.checked)}
            />
            <span>Keep media folders (from-ae / from-resolve / from-premiere / Output)</span>
          </label>
          {!keepMedia ? (
            <p className="uninstall-warn">
              Media folders under Videos/Movies → EncodeIt will be deleted, including any encodes still
              in Output.
            </p>
          ) : null}
          {error ? <p className="ex-error">{error}</p> : null}
          {failures.length ? (
            <p className="prefs-muted">Some paths could not be removed (may need admin): {failures[0]}</p>
          ) : null}
        </div>
        <footer className="about-footer">
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="danger" disabled={busy} onClick={() => void confirm()}>
            {busy ? 'Removing…' : 'Uninstall'}
          </button>
        </footer>
      </div>
    </div>
  )
}
