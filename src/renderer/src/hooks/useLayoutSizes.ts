import { useEffect, useState } from 'react'

export interface LayoutSizes {
  leftWidth: number
  leftBottomRatio: number
  /** Height of the top-right Encoding panel (AME default). */
  rightTopHeight: number
}

const STORAGE_KEY = 'encode-this.layout-sizes.v3'

const DEFAULTS: LayoutSizes = {
  leftWidth: 360,
  leftBottomRatio: 0.48,
  rightTopHeight: 220
}

const LIMITS = {
  leftWidth: { min: 240, max: 640 },
  leftBottomRatio: { min: 0.22, max: 0.78 },
  rightTopHeight: { min: 140, max: 480 }
}

function clamp(key: keyof LayoutSizes, value: number): number {
  const { min, max } = LIMITS[key]
  return Math.min(max, Math.max(min, value))
}

function load(): LayoutSizes {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<LayoutSizes>
    return {
      leftWidth: clamp('leftWidth', parsed.leftWidth ?? DEFAULTS.leftWidth),
      leftBottomRatio: clamp('leftBottomRatio', parsed.leftBottomRatio ?? DEFAULTS.leftBottomRatio),
      rightTopHeight: clamp('rightTopHeight', parsed.rightTopHeight ?? DEFAULTS.rightTopHeight)
    }
  } catch {
    return DEFAULTS
  }
}

export function useLayoutSizes() {
  const [sizes, setSizes] = useState<LayoutSizes>(() => load())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes))
  }, [sizes])

  return {
    sizes,
    defaults: DEFAULTS,
    setLeftWidth: (value: number) =>
      setSizes((s) => ({ ...s, leftWidth: clamp('leftWidth', Math.round(value)) })),
    nudgeLeftWidth: (delta: number) =>
      setSizes((s) => ({ ...s, leftWidth: clamp('leftWidth', Math.round(s.leftWidth + delta)) })),
    setLeftBottomRatio: (value: number) =>
      setSizes((s) => ({ ...s, leftBottomRatio: clamp('leftBottomRatio', value) })),
    nudgeLeftBottomRatio: (deltaPx: number, columnHeight: number) =>
      setSizes((s) => {
        if (columnHeight <= 0) return s
        return {
          ...s,
          leftBottomRatio: clamp('leftBottomRatio', s.leftBottomRatio - deltaPx / columnHeight)
        }
      }),
    setRightTopHeight: (value: number) =>
      setSizes((s) => ({
        ...s,
        rightTopHeight: clamp('rightTopHeight', Math.round(value))
      })),
    nudgeRightTopHeight: (delta: number) =>
      setSizes((s) => ({
        ...s,
        rightTopHeight: clamp('rightTopHeight', Math.round(s.rightTopHeight + delta))
      }))
  }
}
