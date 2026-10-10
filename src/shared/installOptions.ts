/** Written by Windows NSIS / macOS PKG; consumed on first app launch. */
export interface InstallOptions {
  /** "standard" = all host integrations; "custom" = only checked ones. */
  mode: 'standard' | 'custom'
  afterEffects: boolean
  resolve: boolean
  premiere: boolean
}

export const DEFAULT_INSTALL_OPTIONS: InstallOptions = {
  mode: 'standard',
  afterEffects: true,
  resolve: true,
  premiere: true
}

export function normalizeInstallOptions(raw: unknown): InstallOptions {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_INSTALL_OPTIONS }
  const o = raw as Partial<InstallOptions>
  if (o.mode === 'standard' || (!o.mode && o.afterEffects == null && o.resolve == null)) {
    return { ...DEFAULT_INSTALL_OPTIONS }
  }
  return {
    mode: o.mode === 'custom' ? 'custom' : 'standard',
    afterEffects: o.afterEffects !== false,
    resolve: o.resolve !== false,
    premiere: o.premiere !== false
  }
}

/** Effective flags after applying standard vs custom. */
export function resolvedInstallFlags(options: InstallOptions): {
  afterEffects: boolean
  resolve: boolean
  premiere: boolean
} {
  if (options.mode === 'standard') {
    return { afterEffects: true, resolve: true, premiere: true }
  }
  return {
    afterEffects: Boolean(options.afterEffects),
    resolve: Boolean(options.resolve),
    premiere: Boolean(options.premiere)
  }
}
