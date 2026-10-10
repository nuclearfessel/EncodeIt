import { useEffect, useRef, useState } from 'react'

interface Props {
  orientation: 'vertical' | 'horizontal'
  onDrag: (delta: number) => void
  onReset?: () => void
  label: string
}

export function Splitter({ orientation, onDrag, onReset, label }: Props) {
  const [dragging, setDragging] = useState(false)
  const lastPos = useRef(0)

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: PointerEvent) => {
      const pos = orientation === 'vertical' ? e.clientX : e.clientY
      const delta = pos - lastPos.current
      lastPos.current = pos
      if (delta !== 0) onDrag(delta)
    }

    const onUp = () => setDragging(false)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    document.body.classList.add(
      orientation === 'vertical' ? 'is-col-resizing' : 'is-row-resizing'
    )

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.body.classList.remove('is-col-resizing', 'is-row-resizing')
    }
  }, [dragging, onDrag, orientation])

  return (
    <div
      className={`splitter ${orientation} ${dragging ? 'active' : ''}`}
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      title={`${label} — drag to resize, double-click to reset`}
      onPointerDown={(e) => {
        e.preventDefault()
        lastPos.current = orientation === 'vertical' ? e.clientX : e.clientY
        setDragging(true)
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onDoubleClick={() => onReset?.()}
    />
  )
}
