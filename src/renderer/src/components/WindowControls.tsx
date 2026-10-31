import { useEffect, useState } from 'react'

/** In-app window chrome — replaces the OS title-bar accent strip. */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    void window.EncodeIt.windowIsMaximized().then(setMaximized)
    const off = window.EncodeIt.onWindowState((state) => setMaximized(state.maximized))
    return () => {
      off()
    }
  }, [])

  return (
    <div className="window-controls" role="group" aria-label="Window">
      <button
        type="button"
        className="window-control"
        title="Minimize"
        aria-label="Minimize"
        onClick={() => void window.EncodeIt.windowMinimize()}
      >
        <svg width="10" height="1" viewBox="0 0 10 1" aria-hidden="true">
          <rect width="10" height="1" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        className="window-control"
        title={maximized ? 'Restore' : 'Maximize'}
        aria-label={maximized ? 'Restore' : 'Maximize'}
        onClick={() => void window.EncodeIt.windowMaximizeToggle()}
      >
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M2 3h5v5H2V3zm1-1h5v1H3V2zm6 2v5H8V3H3V2h6v2z"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="window-control window-control-close"
        title="Close"
        aria-label="Close"
        onClick={() => void window.EncodeIt.windowClose()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M1.5 1.5l7 7M8.5 1.5l-7 7"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
