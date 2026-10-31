import type { EncodeItApi } from './index'

declare global {
  interface Window {
    EncodeIt: EncodeItApi
  }
}

export {}
