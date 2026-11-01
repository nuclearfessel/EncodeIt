interface Props {
  open: boolean
  hostFolders?: {
    fromAe: string
    fromResolve: string
    fromPremiere: string
    output: string
  }
  coachHosts?: {
    afterEffects: boolean
    resolve: boolean
    premiere: boolean
  }
  onDismiss: () => void
}

/** One-shot tip when host add-ons/scripts are installed and folders were set up. */
export function IntegrationCoachBanner({ open, hostFolders, coachHosts, onDismiss }: Props) {
  if (!open) return null

  const showAe = Boolean(coachHosts?.afterEffects)
  const showResolve = Boolean(coachHosts?.resolve)
  const showPremiere = Boolean(coachHosts?.premiere)
  const anyPath = hostFolders && (showAe || showResolve || showPremiere)

  return (
    <div className="integration-coach" role="status">
      <div className="integration-coach-body">
        <strong>Host add-ons ready</strong>
        <p>
          Point After Effects, Premiere Pro, or DaVinci Resolve render/export destinations at the
          matching <code>from-*</code> folders (Preferences → Integrations). Keep EncodeIt
          running to auto-queue new files.
        </p>
        {anyPath ? (
          <p className="integration-coach-paths">
            {showAe ? (
              <>
                AE → <code>{hostFolders.fromAe}</code>
                {showResolve || showPremiere ? <br /> : null}
              </>
            ) : null}
            {showResolve ? (
              <>
                Resolve → <code>{hostFolders.fromResolve}</code>
                {showPremiere ? <br /> : null}
              </>
            ) : null}
            {showPremiere ? (
              <>
                Premiere → <code>{hostFolders.fromPremiere}</code>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      <button type="button" className="primary" onClick={onDismiss}>
        Got it
      </button>
    </div>
  )
}
