/**
 * Detect After Effects / DaVinci Resolve / Premiere on the local machine.
 * Used by first-launch setup; installers duplicate the same path checks.
 */

export interface HostAppPresence {
  afterEffects: boolean
  resolve: boolean
  premiere: boolean
}

export function emptyHostAppPresence(): HostAppPresence {
  return { afterEffects: false, resolve: false, premiere: false }
}
