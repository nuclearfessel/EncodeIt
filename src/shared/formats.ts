import type { FormatDefinition } from './types'

/** Containers / formats from Adobe Media Encoder export list + Shutter / Compressor / TMPGEnc. */
export const FORMATS: FormatDefinition[] = [
  {
    id: 'h264',
    name: 'H.264',
    extension: 'mp4',
    container: 'mp4',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'shutter', 'compressor', 'tmpgenc', 'common'],
    description: 'AVC in MP4 — web, social, Blu-ray-style delivery, devices.',
    codecs: ['libx264', 'h264_nvenc', 'h264_qsv', 'h264_amf', 'h264_videotoolbox']
  },
  {
    id: 'h264-bluray',
    name: 'H.264 Blu-ray',
    extension: 'm2ts',
    container: 'mpegts',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'tmpgenc'],
    description: 'H.264 Blu-ray–oriented MPEG-TS output.',
    codecs: ['libx264']
  },
  {
    id: 'hevc',
    name: 'HEVC (H.265)',
    extension: 'mp4',
    container: 'mp4',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'shutter', 'compressor', 'tmpgenc', 'common'],
    description: 'HEVC up to 8K; hardware when available.',
    codecs: ['libx265', 'hevc_nvenc', 'hevc_qsv', 'hevc_amf', 'hevc_videotoolbox']
  },
  {
    id: 'hevc-mov',
    name: 'HEVC QuickTime',
    extension: 'mov',
    container: 'mov',
    category: 'video',
    platforms: ['all'],
    sources: ['compressor', 'ame', 'shutter'],
    description: 'HEVC in MOV (Apple devices / alpha workflows).',
    codecs: ['libx265', 'hevc_videotoolbox']
  },
  {
    id: 'mpeg4',
    name: 'MPEG-4',
    extension: 'mp4',
    container: 'mp4',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'tmpgenc', 'shutter'],
    description: 'MPEG-4 Part 2 / simple MP4 delivery.',
    codecs: ['mpeg4', 'libx264']
  },
  {
    id: 'mpeg2',
    name: 'MPEG-2',
    extension: 'mpg',
    container: 'mpeg',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'tmpgenc', 'shutter'],
    description: 'MPEG-2 program stream / DVD-style.',
    codecs: ['mpeg2video']
  },
  {
    id: 'mpeg2-bluray',
    name: 'MPEG-2 Blu-ray',
    extension: 'm2ts',
    container: 'mpegts',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'tmpgenc'],
    description: 'MPEG-2 Blu-ray transport stream.',
    codecs: ['mpeg2video']
  },
  {
    id: 'mpeg2-dvd',
    name: 'MPEG-2 DVD',
    extension: 'mpg',
    container: 'dvd',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'tmpgenc'],
    description: 'DVD-Video oriented MPEG-2.',
    codecs: ['mpeg2video']
  },
  {
    id: 'prores-mov',
    name: 'Apple ProRes (QuickTime)',
    extension: 'mov',
    container: 'mov',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'compressor', 'shutter', 'common'],
    description: 'ProRes 422 Proxy/LT/422/HQ and 4444/XQ in MOV.',
    codecs: ['prores_ks']
  },
  {
    id: 'prores-mxf',
    name: 'Apple ProRes MXF OP1a',
    extension: 'mxf',
    container: 'mxf',
    category: 'video',
    platforms: ['all'],
    sources: ['ame'],
    description: 'ProRes essence in MXF OP1a.',
    codecs: ['prores_ks']
  },
  {
    id: 'dnx-mxf',
    name: 'DNxHR/DNxHD MXF OP1a',
    extension: 'mxf',
    container: 'mxf',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'shutter', 'common'],
    description: 'Avid DNxHD and DNxHR in MXF OP1a.',
    codecs: ['dnxhd']
  },
  {
    id: 'dnx-mov',
    name: 'DNxHD/DNxHR QuickTime',
    extension: 'mov',
    container: 'mov',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'shutter'],
    description: 'DNx family in QuickTime.',
    codecs: ['dnxhd']
  },
  {
    id: 'mxf-op1a',
    name: 'MXF OP1a',
    extension: 'mxf',
    container: 'mxf',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'shutter'],
    description:
      'Broadcast MXF: AVC-Intra, AVC-LongG, DV, DVCPRO, IMX, XAVC, XDCAM.',
    codecs: ['libx264', 'mpeg2video', 'dvvideo']
  },
  {
    id: 'as10',
    name: 'AS-10',
    extension: 'mxf',
    container: 'mxf',
    category: 'video',
    platforms: ['all'],
    sources: ['ame'],
    description: 'AS-10 XDCAM HD shims (best-effort FFmpeg mapping).',
    codecs: ['mpeg2video'],
    notes: 'Certified AS-10 wrappers may differ from this open mapping.'
  },
  {
    id: 'as11',
    name: 'AS-11',
    extension: 'mxf',
    container: 'mxf',
    category: 'video',
    platforms: ['all'],
    sources: ['ame'],
    description: 'AS-11 AVC-Intra / IMX shims (best-effort).',
    codecs: ['libx264', 'mpeg2video'],
    notes: 'Full DPP AS-11 metadata requires specialized tooling.'
  },
  {
    id: 'jpeg2000-mxf',
    name: 'JPEG 2000 MXF OP1a',
    extension: 'mxf',
    container: 'mxf',
    category: 'video',
    platforms: ['all'],
    sources: ['ame'],
    description: 'JPEG 2000 essence in MXF.',
    codecs: ['jpeg2000']
  },
  {
    id: 'quicktime',
    name: 'QuickTime',
    extension: 'mov',
    container: 'mov',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'compressor', 'shutter'],
    description:
      'MOV with Animation, ProRes, DNx, DV, CineForm, uncompressed.',
    codecs: ['qtrle', 'prores_ks', 'dnxhd', 'dvvideo', 'cfhd', 'rawvideo', 'v210']
  },
  {
    id: 'avi',
    name: 'AVI',
    extension: 'avi',
    container: 'avi',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'tmpgenc', 'shutter'],
    description: 'AVI with DV, uncompressed, and legacy codecs. Adobe lists Windows-only; EncodeIt offers cross-platform FFmpeg paths.',
    codecs: ['dvvideo', 'rawvideo', 'v210', 'msvideo1', 'utvideo']
  },
  {
    id: 'avi-uncompressed',
    name: 'AVI (Uncompressed)',
    extension: 'avi',
    container: 'avi',
    category: 'video',
    platforms: ['all'],
    sources: ['ame'],
    description: 'Uncompressed UYVY / V210 AVI.',
    codecs: ['rawvideo', 'v210']
  },
  {
    id: 'windows-media',
    name: 'Windows Media',
    extension: 'wmv',
    container: 'asf',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'tmpgenc'],
    description: 'WMV7/8-style delivery (open encoder approximations of WMV9).',
    codecs: ['wmv1', 'wmv2'],
    notes: 'WMV9 Advanced Profile is not available as a free encoder; WMV7/8 used as open stand-ins.'
  },
  {
    id: 'p2',
    name: 'P2 Movie',
    extension: 'mxf',
    container: 'mxf',
    category: 'video',
    platforms: ['all'],
    sources: ['ame'],
    description: 'Panasonic P2-style Op-Atom-ish MXF (DVCPRO / AVC-Intra).',
    codecs: ['dvvideo', 'libx264'],
    notes: 'Full P2 folder structure is not reproduced; essence encode is available.'
  },
  {
    id: 'dcp',
    name: 'DCP (JPEG 2000)',
    extension: 'mxf',
    container: 'mxf',
    category: 'video',
    platforms: ['all'],
    sources: ['ame'],
    description: 'JPEG 2000 DCP-oriented encode (not a full Wraptor package).',
    codecs: ['jpeg2000'],
    notes: 'Full encrypted DCP packaging requires specialized tools.'
  },
  {
    id: 'av1',
    name: 'AV1',
    extension: 'mp4',
    container: 'mp4',
    category: 'video',
    platforms: ['all'],
    sources: ['shutter', 'common'],
    description: 'AV1 for modern web delivery (Shutter-style).',
    codecs: ['libaom-av1', 'libsvtav1', 'av1_nvenc']
  },
  {
    id: 'vp9',
    name: 'VP9',
    extension: 'webm',
    container: 'webm',
    category: 'video',
    platforms: ['all'],
    sources: ['shutter', 'common'],
    description: 'VP9 in WebM.',
    codecs: ['libvpx-vp9']
  },
  {
    id: 'vp8',
    name: 'VP8',
    extension: 'webm',
    container: 'webm',
    category: 'video',
    platforms: ['all'],
    sources: ['shutter'],
    description: 'VP8 in WebM.',
    codecs: ['libvpx']
  },
  {
    id: 'ffv1',
    name: 'FFV1',
    extension: 'mkv',
    container: 'matroska',
    category: 'video',
    platforms: ['all'],
    sources: ['shutter'],
    description: 'Lossless archival FFV1.',
    codecs: ['ffv1']
  },
  {
    id: 'hap',
    name: 'Hap',
    extension: 'mov',
    container: 'mov',
    category: 'video',
    platforms: ['all'],
    sources: ['shutter', 'common'],
    description: 'Hap / Hap Alpha playback codecs.',
    codecs: ['hap']
  },
  {
    id: 'mkv',
    name: 'Matroska',
    extension: 'mkv',
    container: 'matroska',
    category: 'video',
    platforms: ['all'],
    sources: ['shutter', 'tmpgenc', 'common'],
    description: 'Flexible MKV container for many codecs.',
    codecs: ['libx264', 'libx265', 'ffv1', 'libvpx-vp9']
  },
  {
    id: 'gif',
    name: 'Animated GIF',
    extension: 'gif',
    container: 'gif',
    category: 'video',
    platforms: ['all'],
    sources: ['ame', 'shutter'],
    description: 'Animated GIF.',
    codecs: ['gif']
  },
  {
    id: 'still-png',
    name: 'PNG',
    extension: 'png',
    container: 'image2',
    category: 'still',
    platforms: ['all'],
    sources: ['ame', 'shutter', 'compressor'],
    description: 'PNG still or sequence.',
    codecs: ['png']
  },
  {
    id: 'still-jpeg',
    name: 'JPEG',
    extension: 'jpg',
    container: 'image2',
    category: 'still',
    platforms: ['all'],
    sources: ['ame', 'shutter'],
    description: 'JPEG still or sequence.',
    codecs: ['mjpeg']
  },
  {
    id: 'still-tiff',
    name: 'TIFF',
    extension: 'tif',
    container: 'image2',
    category: 'still',
    platforms: ['all'],
    sources: ['ame', 'shutter', 'compressor'],
    description: 'TIFF still or sequence.',
    codecs: ['tiff']
  },
  {
    id: 'still-tga',
    name: 'Targa',
    extension: 'tga',
    container: 'image2',
    category: 'still',
    platforms: ['all'],
    sources: ['ame'],
    description: 'TGA still or sequence.',
    codecs: ['targa']
  },
  {
    id: 'still-dpx',
    name: 'DPX',
    extension: 'dpx',
    container: 'image2',
    category: 'still',
    platforms: ['all'],
    sources: ['ame', 'shutter'],
    description: 'DPX film/VFX sequence.',
    codecs: ['dpx']
  },
  {
    id: 'still-exr',
    name: 'OpenEXR',
    extension: 'exr',
    container: 'image2',
    category: 'still',
    platforms: ['all'],
    sources: ['ame', 'shutter', 'compressor'],
    description: 'OpenEXR still or sequence.',
    codecs: ['exr']
  },
  {
    id: 'still-bmp',
    name: 'Bitmap',
    extension: 'bmp',
    container: 'image2',
    category: 'still',
    platforms: ['all'],
    sources: ['ame'],
    description: 'BMP still or sequence (Adobe: Windows-only listing).',
    codecs: ['bmp']
  },
  {
    id: 'audio-aac',
    name: 'AAC Audio',
    extension: 'm4a',
    container: 'ipod',
    category: 'audio',
    platforms: ['all'],
    sources: ['ame', 'shutter', 'compressor', 'tmpgenc'],
    description: 'AAC Version 1 / 2 style audio export.',
    codecs: ['aac']
  },
  {
    id: 'audio-mp3',
    name: 'MP3',
    extension: 'mp3',
    container: 'mp3',
    category: 'audio',
    platforms: ['all'],
    sources: ['ame', 'shutter', 'tmpgenc'],
    description: 'MPEG Audio Layer III.',
    codecs: ['libmp3lame']
  },
  {
    id: 'audio-wav',
    name: 'Waveform Audio',
    extension: 'wav',
    container: 'wav',
    category: 'audio',
    platforms: ['all'],
    sources: ['ame', 'shutter', 'compressor', 'tmpgenc'],
    description: 'PCM WAV.',
    codecs: ['pcm_s16le', 'pcm_s24le', 'pcm_f32le']
  },
  {
    id: 'audio-aiff',
    name: 'AIFF',
    extension: 'aif',
    container: 'aiff',
    category: 'audio',
    platforms: ['all'],
    sources: ['ame', 'compressor'],
    description: 'Audio Interchange File Format.',
    codecs: ['pcm_s16be', 'pcm_s24be']
  },
  {
    id: 'audio-flac',
    name: 'FLAC',
    extension: 'flac',
    container: 'flac',
    category: 'audio',
    platforms: ['all'],
    sources: ['shutter', 'common'],
    description: 'Lossless FLAC.',
    codecs: ['flac']
  },
  {
    id: 'audio-opus',
    name: 'Opus',
    extension: 'opus',
    container: 'opus',
    category: 'audio',
    platforms: ['all'],
    sources: ['shutter', 'common'],
    description: 'Opus audio.',
    codecs: ['libopus']
  }
]

export function getFormat(id: string): FormatDefinition | undefined {
  return FORMATS.find((f) => f.id === id)
}

export function formatsForPlatform(platform: NodeJS.Platform): FormatDefinition[] {
  return FORMATS.filter(
    (f) => f.platforms.includes('all') || f.platforms.includes(platform as never)
  )
}
