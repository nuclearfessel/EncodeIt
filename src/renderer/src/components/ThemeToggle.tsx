import type { ThemeMode } from '../../../shared/types'
import { resolveThemeMode } from '../theme'
import { Moon, SunFill, iconSize } from './icons'

interface Props {
  themeMode: ThemeMode | undefined | null
}

/** Title-bar control: toggles between light and dark (locks off System). */
export function ThemeToggle({ themeMode }: Props) {
  const resolved = resolveThemeMode(themeMode)
  const next: ThemeMode = resolved === 'dark' ? 'light' : 'dark'
  const label = next === 'light' ? 'Switch to light theme' : 'Switch to dark theme'
  const Icon = resolved === 'dark' ? SunFill : Moon

  return (
    <button
      type="button"
      className="window-control theme-toggle"
      title={label}
      aria-label={label}
      onClick={() => void window.EncodeIt.setThemeMode(next)}
    >
      <Icon size={iconSize.md} strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}
