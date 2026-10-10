import { useEffect, useState } from 'react'
import type { HostAppPresence } from '../../../shared/hostAppDetect'
import type { InstallOptions } from '../../../shared/installOptions'

interface Props {
  open: boolean
  presence: HostAppPresence | null | undefined
  onComplete: (next: Awaited<ReturnType<typeof window.encodeThis.completeIntegrationSetup>>) => void
}

/**
 * First-launch Standard / Custom picker when the installer could not ask
 * (macOS DMG, portable builds). Mirrors the Windows NSIS page.
 * Only detected host apps can be selected; Standard = all detected.
 */
export function IntegrationSetupDialog({ open, presence, onComplete }: Props) {
  const detected = presence ?? { afterEffects: false, resolve: false, premiere: false }
  const anyDetected = detected.afterEffects || detected.resolve || detected.premiere

  const [mode, setMode] = useState<'standard' | 'custom'>('standard')
  const [afterEffects, setAfterEffects] = useState(false)
  const [resolve, setResolve] = useState(false)
  const [premiere, setPremiere] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setAfterEffects(detected.afterEffects)
    setResolve(detected.resolve)
    setPremiere(detected.premiere)
    setMode('standard')
    setError(null)
  }, [open, detected.afterEffects, detected.resolve, detected.premiere])

  if (!open) return null

  async function finish() {
    setSaving(true)
    setError(null)
    const options: InstallOptions =
      mode === 'standard'
        ? {
            mode: 'standard',
            afterEffects: detected.afterEffects,
            resolve: detected.resolve,
            premiere: detected.premiere
          }
        : {
            mode: 'custom',
            afterEffects: afterEffects && detected.afterEffects,
            resolve: resolve && detected.resolve,
            premiere: premiere && detected.premiere
          }
    try {
      const saved = await window.encodeThis.completeIntegrationSetup(options)
      onComplete(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  function label(name: string, installed: boolean): string {
    return installed ? name : `${name} (not installed)`
  }

  return (
    <div className="prefs-backdrop" role="presentation">
      <div
        className="prefs-dialog integration-setup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="integration-setup-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="prefs-header">
          <h2 id="integration-setup-title">Host integrations</h2>
        </header>
        <div className="prefs-body integration-setup-body">
          <p className="prefs-help">
            Encode This only sets up watch folders for apps found on this Mac or PC. Standard
            installs every detected host app; Custom lets you choose among them.
          </p>
          {!anyDetected ? (
            <p className="prefs-muted">
              No After Effects, DaVinci Resolve, or Premiere Pro install was detected. You can
              continue and add watch folders later in Preferences.
            </p>
          ) : null}
          <label className="prefs-check">
            <input
              type="radio"
              name="integration-mode"
              checked={mode === 'standard'}
              onChange={() => setMode('standard')}
            />
            Standard — set up every detected host app
          </label>
          <label className="prefs-check">
            <input
              type="radio"
              name="integration-mode"
              checked={mode === 'custom'}
              onChange={() => setMode('custom')}
              disabled={!anyDetected}
            />
            Custom — choose among detected apps
          </label>
          <div className={`integration-setup-custom ${mode === 'custom' ? '' : 'disabled'}`}>
            <label className="prefs-check">
              <input
                type="checkbox"
                checked={mode === 'standard' ? detected.afterEffects : afterEffects}
                disabled={mode !== 'custom' || !detected.afterEffects}
                onChange={(e) => setAfterEffects(e.target.checked)}
              />
              {label('After Effects', detected.afterEffects)}
            </label>
            <label className="prefs-check">
              <input
                type="checkbox"
                checked={mode === 'standard' ? detected.resolve : resolve}
                disabled={mode !== 'custom' || !detected.resolve}
                onChange={(e) => setResolve(e.target.checked)}
              />
              {label('DaVinci Resolve', detected.resolve)}
            </label>
            <label className="prefs-check">
              <input
                type="checkbox"
                checked={mode === 'standard' ? detected.premiere : premiere}
                disabled={mode !== 'custom' || !detected.premiere}
                onChange={(e) => setPremiere(e.target.checked)}
              />
              {label('Premiere Pro', detected.premiere)}
            </label>
          </div>
          {error ? <div className="prefs-error">{error}</div> : null}
        </div>
        <footer className="prefs-footer">
          <button type="button" className="primary" disabled={saving} onClick={() => void finish()}>
            {saving ? 'Setting up…' : 'Continue'}
          </button>
        </footer>
      </div>
    </div>
  )
}
