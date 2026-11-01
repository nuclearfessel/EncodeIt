export interface UpdateBarStatus {
  currentVersion: string
  latestVersion: string | null
  updateAvailable: boolean
}

interface Props {
  status: UpdateBarStatus | null
  fallbackVersion: string
  onDownload: () => void
  onDismiss: () => void
}

export function StatusBar({ status, fallbackVersion, onDownload, onDismiss }: Props) {
  const version = status?.currentVersion || fallbackVersion
  const updateReady = Boolean(status?.updateAvailable && status?.latestVersion)

  return (
    <div
      className={`app-status-bar${updateReady ? ' has-update' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="app-status-bar-text">
        {updateReady
          ? `EncodeIt ${status!.latestVersion} is available (you have ${version}).`
          : `EncodeIt ${version}`}
      </span>
      <div className="app-status-bar-actions">
        {updateReady ? (
          <>
            <button type="button" className="primary" onClick={onDownload}>
              Download…
            </button>
            <button type="button" onClick={onDismiss}>
              Not now
            </button>
          </>
        ) : (
          <span className="app-status-bar-idle">Ready</span>
        )}
      </div>
    </div>
  )
}
