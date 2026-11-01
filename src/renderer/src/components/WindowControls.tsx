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
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M1 5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M3 2.5h4.5V7M2.5 3.5H7v4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <rect
              x="1.75"
              y="1.75"
              width="6.5"
              height="6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
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
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M2.2 2.2l5.6 5.6M7.8 2.2l-5.6 5.6"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
