import { CODEC_VARIANTS } from './codecs'
import { FORMATS } from './formats'
import { PRESETS } from './presets'
import type { CatalogStats } from './types'

export function getCatalogStats(): CatalogStats {
  return {
    formats: FORMATS.length,
    codecs: CODEC_VARIANTS.length,
    presets: PRESETS.length
  }
}

export { FORMATS, CODEC_VARIANTS, PRESETS }
