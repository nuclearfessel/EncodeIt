import { useEffect, useState } from 'react'
import type { HostAppPresence } from '../../../shared/hostAppDetect'
import type { InstallOptions } from '../../../shared/installOptions'

interface Props {
  open: boolean
  presence: HostAppPresence | null | undefined
  onComplete: (next: Awaited<ReturnType<typeof window.EncodeIt.completeIntegrationSetup>>) => void
}

/**
 * First-launch Standard / Custom picker when the installer could not ask
 * (macOS DMG, portable builds). Mirrors the Windows NSIS page.
 * Standard = detected apps only. Custom = any combination the user ticks.
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
        : { mode: 'custom', afterEffects, resolve, premiere }
    try {
      const saved = await window.EncodeIt.completeIntegrationSetup(options)
      onComplete(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const aeChecked = mode === 'standard' ? detected.afterEffects : afterEffects
  const resolveChecked = mode === 'standard' ? detected.resolve : resolve
  const premiereChecked = mode === 'standard' ? detected.premiere : premiere

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
            Standard sets up apps found on this computer. Custom lets you choose After Effects,
            DaVinci Resolve, and/or Premiere Pro yourself.
          </p>
          <p className="prefs-muted">
            Detected:{' '}
            {anyDetected
              ? [
                  detected.afterEffects ? 'After Effects' : null,
                  detected.resolve ? 'Resolve' : null,
                  detected.premiere ? 'Premiere' : null
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'none'}
          </p>
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
            />
            Custom — choose applications
          </label>
          <div className={`integration-setup-custom ${mode === 'custom' ? '' : 'disabled'}`}>
            <label className="prefs-check">
              <input
                type="checkbox"
                checked={aeChecked}
                disabled={mode !== 'custom'}
                onChange={(e) => setAfterEffects(e.target.checked)}
              />
              After Effects
              {detected.afterEffects ? '' : ' (not detected)'}
            </label>
            <label className="prefs-check">
              <input
                type="checkbox"
                checked={resolveChecked}
                disabled={mode !== 'custom'}
                onChange={(e) => setResolve(e.target.checked)}
              />
              DaVinci Resolve
              {detected.resolve ? '' : ' (not detected)'}
            </label>
            <label className="prefs-check">
              <input
                type="checkbox"
                checked={premiereChecked}
                disabled={mode !== 'custom'}
                onChange={(e) => setPremiere(e.target.checked)}
              />
              Premiere Pro
              {detected.premiere ? '' : ' (not detected)'}
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
