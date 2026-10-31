export interface UpdateBarStatus {
  currentVersion: string
  latestVersion: string | null
  updateAvailable: boolean
}

interface Props {
  status: UpdateBarStatus | null
  onDownload: () => void
  onDismiss: () => void
}

export function StatusBar({ status, onDownload, onDismiss }: Props) {
  if (!status?.updateAvailable || !status.latestVersion) return null

  return (
    <div className="app-status-bar" role="status">
      <span className="app-status-bar-text">
        EncodeIt {status.latestVersion} is available (you have {status.currentVersion}).
      </span>
      <div className="app-status-bar-actions">
        <button type="button" className="primary" onClick={onDownload}>
          Download…
        </button>
        <button type="button" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </div>
  )
}
