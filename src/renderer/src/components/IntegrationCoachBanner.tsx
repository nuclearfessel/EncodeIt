interface Props {
  open: boolean
  hostFolders?: {
    fromAe: string
    fromResolve: string
    fromPremiere: string
    output: string
  }
  onDismiss: () => void
}

/** One-shot tip after host integration folders are created. */
export function IntegrationCoachBanner({ open, hostFolders, onDismiss }: Props) {
  if (!open) return null

  return (
    <div className="integration-coach" role="status">
      <div className="integration-coach-body">
        <strong>Host folders ready</strong>
        <p>
          Point After Effects, Premiere Pro, or DaVinci Resolve render/export destinations at the
          matching <code>from-*</code> folders (Preferences → Integrations). Keep Encode This
          running to auto-queue new files.
        </p>
        {hostFolders ? (
          <p className="integration-coach-paths">
            AE → <code>{hostFolders.fromAe}</code>
            <br />
            Resolve → <code>{hostFolders.fromResolve}</code>
            <br />
            Premiere → <code>{hostFolders.fromPremiere}</code>
          </p>
        ) : null}
      </div>
      <button type="button" className="primary" onClick={onDismiss}>
        Got it
      </button>
    </div>
  )
}
