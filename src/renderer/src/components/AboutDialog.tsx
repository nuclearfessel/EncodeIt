import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  version: string
  ffmpegPath?: string
  ffmpegSource?: string
}

export function AboutDialog({ open, onClose, version, ffmpegPath, ffmpegSource }: Props) {
  const [logPath, setLogPath] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    void window.EncodeIt
      .getLogPath()
      .then(setLogPath)
      .catch(() => setLogPath(null))
  }, [open])

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
          <h2 id="about-title">About EncodeIt</h2>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="about-body">
          <div className="about-brand-row">
            <img
              className="about-logo"
              src={new URL('../assets/encodeit-logo.png', import.meta.url).href}
              alt=""
              width={56}
              height={56}
              draggable={false}
            />
            <div>
              <p className="about-brand">EncodeIt</p>
              <p className="about-meta">Version {version}</p>
            </div>
          </div>
          <p className="about-copy">
            Open-source batch media encoder with a queue and preset browser. Encoding is powered by
            bundled FFmpeg.
          </p>
          {ffmpegPath ? (
            <p className="about-meta">
              FFmpeg ({ffmpegSource || 'unknown'}): <code className="about-code">{ffmpegPath}</code>
            </p>
          ) : null}
          {logPath ? (
            <p className="about-meta">
              Log: <code className="about-code">{logPath}</code>
            </p>
          ) : null}
          <p className="about-meta about-meta-spaced">
            MIT License · github.com/nuclearfessel/encodeit
          </p>
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
