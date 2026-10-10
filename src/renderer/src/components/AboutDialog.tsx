interface Props {
  open: boolean
  onClose: () => void
  version: string
}

export function AboutDialog({ open, onClose, version }: Props) {
  if (!open) return null

  return (
    <div className="about-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="about-header">
          <h2 id="about-title">About Encode This</h2>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="about-body">
          <p className="about-brand">Encode This</p>
          <p className="about-meta">Version {version}</p>
          <p className="about-copy">
            Open-source batch media encoder with an Adobe Media Encoder / Shutter Encoder–style
            queue. Encoding is powered by bundled FFmpeg.
          </p>
          <p className="about-meta">MIT License · github.com/nuclearfessel/encode-this</p>
        </div>
        <footer className="about-footer">
          <button type="button" className="primary" onClick={onClose}>
            OK
          </button>
        </footer>
      </div>
    </div>
  )
}
