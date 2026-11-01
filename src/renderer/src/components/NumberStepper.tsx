import type { KeyboardEvent } from 'react'
import { ChevronDown, ChevronUp, iconSize } from './icons'

interface Props {
  id?: string
  value: string | number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  /** Snap committed values (e.g. even dimensions). */
  normalize?: (n: number) => number
  className?: string
  inputMode?: 'numeric' | 'decimal'
  onValueChange: (next: number) => void
  /** Optional live text while typing (before blur/commit). */
  onTextChange?: (text: string) => void
}

function parseNum(raw: string | number): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

/** Numeric field with Keyline caret steppers (no OS spin buttons). */
export function NumberStepper({
  id,
  value,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  disabled,
  normalize,
  className,
  inputMode = 'numeric',
  onValueChange,
  onTextChange
}: Props) {
  const display = typeof value === 'number' ? String(value) : value

  function commit(raw: number) {
    let n = raw
    if (!Number.isFinite(n)) return
    if (normalize) n = normalize(n)
    n = Math.min(max, Math.max(min, n))
    if (normalize) n = normalize(n)
    onValueChange(n)
  }

  function nudge(delta: number) {
    if (disabled) return
    const current = parseNum(display)
    const base = current ?? (delta > 0 ? min : max)
    const start = Number.isFinite(base) ? base : 0
    commit(start + delta)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      nudge(step)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      nudge(-step)
      return
    }
    if (e.key === 'Enter') {
      ;(e.target as HTMLInputElement).blur()
    }
  }

  return (
    <div className={`number-stepper ${className ?? ''}`.trim()}>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={display}
        onChange={(e) => {
          const text = e.target.value.replace(/[^\d]/g, '')
          if (onTextChange) onTextChange(text)
          else {
            const n = parseNum(text)
            if (n != null) commit(n)
          }
        }}
        onBlur={() => {
          const n = parseNum(display)
          if (n == null) {
            commit(Number.isFinite(min) ? min : 0)
            return
          }
          commit(n)
        }}
        onKeyDown={onKeyDown}
      />
      <div className="number-stepper-carets" aria-hidden={disabled}>
        <button
          type="button"
          className="number-stepper-caret"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Increase"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => nudge(step)}
        >
          <ChevronUp size={10} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="number-stepper-caret"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Decrease"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => nudge(-step)}
        >
          <ChevronDown size={10} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
