import type { EncodeThisApi } from './index'

declare global {
  interface Window {
    encodeThis: EncodeThisApi
  }
}

export {}
