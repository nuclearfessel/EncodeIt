import type { ThemeMode } from '../../shared/types'

export type ResolvedTheme = 'light' | 'dark'

export function resolveThemeMode(mode: ThemeMode | undefined | null): ResolvedTheme {
  if (mode === 'light' || mode === 'dark') return mode
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

/** Apply light/dark tokens on <html data-theme>. */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.dataset.theme = resolved
}

export function applyThemeMode(mode: ThemeMode | undefined | null): ResolvedTheme {
  const resolved = resolveThemeMode(mode)
  applyResolvedTheme(resolved)
  return resolved
}
