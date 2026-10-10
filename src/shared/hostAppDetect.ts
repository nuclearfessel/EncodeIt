/**
 * Host NLE presence — based on whether the app is **installed on disk**,
 * not whether it is currently running.
 */

export interface HostAppPresence {
  afterEffects: boolean
  resolve: boolean
  premiere: boolean
}

export function emptyHostAppPresence(): HostAppPresence {
  return { afterEffects: false, resolve: false, premiere: false }
}
