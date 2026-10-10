import { CODEC_VARIANTS } from './codecs'
import { FORMATS } from './formats'
import { PRESETS } from './presets'
import type { CatalogStats, SourceFamily } from './types'

export function getCatalogStats(): CatalogStats {
  const bySource: Record<SourceFamily, number> = {
    ame: 0,
    shutter: 0,
    compressor: 0,
    tmpgenc: 0,
    common: 0
  }
  for (const preset of PRESETS) {
    for (const source of preset.sources) bySource[source] += 1
  }
  return {
    formats: FORMATS.length,
    codecs: CODEC_VARIANTS.length,
    presets: PRESETS.length,
    bySource
  }
}

export { FORMATS, CODEC_VARIANTS, PRESETS }
