import type { CodecVariant } from './types'

/**
 * Codec / variant catalog for EncodeIt.
 */
export const CODEC_VARIANTS: CodecVariant[] = [
  // —— H.264 / AVC ——
  {
    id: 'h264-baseline',
    name: 'H.264 Baseline',
    formatIds: ['h264', 'mpeg4', 'mkv'],
    platforms: ['all'],
    video: { codec: 'libx264', profile: 'baseline', level: '3.1', pixelFormat: 'yuv420p' }
  },
  {
    id: 'h264-main',
    name: 'H.264 Main',
    formatIds: ['h264', 'mkv'],
    platforms: ['all'],
    video: { codec: 'libx264', profile: 'main', level: '4.0', pixelFormat: 'yuv420p' }
  },
  {
    id: 'h264-high',
    name: 'H.264 High',
    formatIds: ['h264', 'h264-bluray', 'mkv'],
    platforms: ['all'],
    video: { codec: 'libx264', profile: 'high', level: '5.1', pixelFormat: 'yuv420p' }
  },
  {
    id: 'h264-high10',
    name: 'H.264 High 10',
    formatIds: ['h264', 'mkv'],
    platforms: ['all'],
    video: { codec: 'libx264', profile: 'high10', pixelFormat: 'yuv420p10le' }
  },
  {
    id: 'h264-high422',
    name: 'H.264 High 4:2:2',
    formatIds: ['h264', 'mkv'],
    platforms: ['all'],
    video: { codec: 'libx264', profile: 'high422', pixelFormat: 'yuv422p' }
  },
  {
    id: 'h264-high444',
    name: 'H.264 High 4:4:4 Predictive',
    formatIds: ['h264', 'mkv'],
    platforms: ['all'],
    video: { codec: 'libx264', profile: 'high444', pixelFormat: 'yuv444p' }
  },

  // —— HEVC ——
  {
    id: 'hevc-main',
    name: 'HEVC Main',
    formatIds: ['hevc', 'hevc-mov', 'mkv'],
    platforms: ['all'],
    video: { codec: 'libx265', profile: 'main', pixelFormat: 'yuv420p', tag: 'hvc1' }
  },
  {
    id: 'hevc-main10',
    name: 'HEVC Main 10',
    formatIds: ['hevc', 'hevc-mov', 'mkv'],
    platforms: ['all'],
    video: { codec: 'libx265', profile: 'main10', pixelFormat: 'yuv420p10le', tag: 'hvc1' }
  },
  {
    id: 'hevc-main422-10',
    name: 'HEVC Main 4:2:2 10',
    formatIds: ['hevc', 'mkv'],
    platforms: ['all'],
    video: { codec: 'libx265', profile: 'main422-10', pixelFormat: 'yuv422p10le', tag: 'hvc1' }
  },
  {
    id: 'hevc-main444-10',
    name: 'HEVC Main 4:4:4 10',
    formatIds: ['hevc', 'mkv'],
    platforms: ['all'],
    video: { codec: 'libx265', profile: 'main444-10', pixelFormat: 'yuv444p10le', tag: 'hvc1' }
  },

  // —— Apple ProRes ——
  {
    id: 'prores-422-proxy',
    name: 'Apple ProRes 422 Proxy',
    formatIds: ['prores-mov', 'prores-mxf', 'quicktime'],
    platforms: ['all'],
    video: {
      codec: 'prores_ks',
      proresProfile: 'proxy',
      pixelFormat: 'yuv422p10le',
      extraArgs: ['-vendor', 'apl0']
    }
  },
  {
    id: 'prores-422-lt',
    name: 'Apple ProRes 422 LT',
    formatIds: ['prores-mov', 'prores-mxf', 'quicktime'],
    platforms: ['all'],
    video: {
      codec: 'prores_ks',
      proresProfile: 'lt',
      pixelFormat: 'yuv422p10le',
      extraArgs: ['-vendor', 'apl0']
    }
  },
  {
    id: 'prores-422',
    name: 'Apple ProRes 422',
    formatIds: ['prores-mov', 'prores-mxf', 'quicktime'],
    platforms: ['all'],
    video: {
      codec: 'prores_ks',
      proresProfile: 'standard',
      pixelFormat: 'yuv422p10le',
      extraArgs: ['-vendor', 'apl0']
    }
  },
  {
    id: 'prores-422-hq',
    name: 'Apple ProRes 422 HQ',
    formatIds: ['prores-mov', 'prores-mxf', 'quicktime'],
    platforms: ['all'],
    video: {
      codec: 'prores_ks',
      proresProfile: 'hq',
      pixelFormat: 'yuv422p10le',
      extraArgs: ['-vendor', 'apl0']
    }
  },
  {
    id: 'prores-4444',
    name: 'Apple ProRes 4444',
    formatIds: ['prores-mov', 'prores-mxf', 'quicktime'],
    platforms: ['all'],
    video: {
      codec: 'prores_ks',
      proresProfile: '4444',
      pixelFormat: 'yuva444p10le',
      extraArgs: ['-vendor', 'apl0', '-alpha_bits', '16']
    }
  },
  {
    id: 'prores-4444-xq',
    name: 'Apple ProRes 4444 XQ',
    formatIds: ['prores-mov', 'prores-mxf', 'quicktime'],
    platforms: ['all'],
    video: {
      codec: 'prores_ks',
      proresProfile: '4444xq',
      pixelFormat: 'yuva444p10le',
      extraArgs: ['-vendor', 'apl0', '-alpha_bits', '16']
    },
    notes: 'Available on all platforms via FFmpeg.'
  },

  // —— DNxHD / DNxHR ——
  {
    id: 'dnxhd',
    name: 'DNxHD',
    formatIds: ['dnx-mxf', 'dnx-mov', 'quicktime'],
    platforms: ['all'],
    video: { codec: 'dnxhd', dnxProfile: 'dnxhd', pixelFormat: 'yuv422p' }
  },
  {
    id: 'dnxhr-lb',
    name: 'DNxHR LB',
    formatIds: ['dnx-mxf', 'dnx-mov', 'quicktime'],
    platforms: ['all'],
    video: { codec: 'dnxhd', dnxProfile: 'dnxhr_lb', pixelFormat: 'yuv422p' }
  },
  {
    id: 'dnxhr-sq',
    name: 'DNxHR SQ',
    formatIds: ['dnx-mxf', 'dnx-mov', 'quicktime'],
    platforms: ['all'],
    video: { codec: 'dnxhd', dnxProfile: 'dnxhr_sq', pixelFormat: 'yuv422p' }
  },
  {
    id: 'dnxhr-hq',
    name: 'DNxHR HQ',
    formatIds: ['dnx-mxf', 'dnx-mov', 'quicktime'],
    platforms: ['all'],
    video: { codec: 'dnxhd', dnxProfile: 'dnxhr_hq', pixelFormat: 'yuv422p' }
  },
  {
    id: 'dnxhr-hqx',
    name: 'DNxHR HQX',
    formatIds: ['dnx-mxf', 'dnx-mov', 'quicktime'],
    platforms: ['all'],
    video: { codec: 'dnxhd', dnxProfile: 'dnxhr_hqx', pixelFormat: 'yuv422p10le' }
  },
  {
    id: 'dnxhr-444',
    name: 'DNxHR 444',
    formatIds: ['dnx-mxf', 'dnx-mov', 'quicktime'],
    platforms: ['all'],
    video: { codec: 'dnxhd', dnxProfile: 'dnxhr_444', pixelFormat: 'yuv444p10le' }
  },

  // —— GoPro CineForm ——
  {
    id: 'cineform-yuv',
    name: 'GoPro CineForm (YUV 10-bit)',
    formatIds: ['quicktime'],
    platforms: ['all'],
    video: { codec: 'cfhd', cineformQuality: 'high', pixelFormat: 'yuv422p10le' }
  },
  {
    id: 'cineform-rgb',
    name: 'GoPro CineForm (RGB 12-bit)',
    formatIds: ['quicktime'],
    platforms: ['all'],
    video: { codec: 'cfhd', cineformQuality: 'film1', pixelFormat: 'gbrp12le' }
  },
  {
    id: 'cineform-alpha',
    name: 'GoPro CineForm (RGB + Alpha)',
    formatIds: ['quicktime'],
    platforms: ['all'],
    video: { codec: 'cfhd', cineformQuality: 'film1', pixelFormat: 'gbrap12le' }
  },

  // —— DV / DVCPRO ——
  {
    id: 'dv25-ntsc',
    name: 'DV25 NTSC',
    formatIds: ['avi', 'quicktime', 'mxf-op1a', 'p2'],
    platforms: ['all'],
    video: {
      codec: 'dvvideo',
      width: 720,
      height: 480,
      frameRate: '30000/1001',
      pixelFormat: 'yuv411p',
      videoFilters: ['scale=720:480', 'fps=30000/1001', 'format=yuv411p']
    }
  },
  {
    id: 'dv25-pal',
    name: 'DV25 PAL',
    formatIds: ['avi', 'quicktime', 'mxf-op1a', 'p2'],
    platforms: ['all'],
    video: {
      codec: 'dvvideo',
      width: 720,
      height: 576,
      frameRate: 25,
      pixelFormat: 'yuv420p',
      videoFilters: ['scale=720:576', 'fps=25', 'format=yuv420p']
    }
  },
  {
    id: 'dvcpro50-ntsc',
    name: 'DVCPRO50 NTSC',
    formatIds: ['mxf-op1a', 'quicktime', 'p2', 'avi'],
    platforms: ['all'],
    video: {
      codec: 'dvvideo',
      width: 720,
      height: 480,
      frameRate: '30000/1001',
      pixelFormat: 'yuv422p',
      videoFilters: ['scale=720:480', 'fps=30000/1001', 'format=yuv422p']
    }
  },
  {
    id: 'dvcpro50-pal',
    name: 'DVCPRO50 PAL',
    formatIds: ['mxf-op1a', 'quicktime', 'p2'],
    platforms: ['all'],
    video: {
      codec: 'dvvideo',
      width: 720,
      height: 576,
      frameRate: 25,
      pixelFormat: 'yuv422p',
      videoFilters: ['scale=720:576', 'fps=25', 'format=yuv422p']
    }
  },
  {
    id: 'dvcprohd-1080i59',
    name: 'DVCPRO HD 1080i59.94',
    formatIds: ['mxf-op1a', 'quicktime', 'p2'],
    platforms: ['all'],
    video: {
      codec: 'dvvideo',
      width: 1280,
      height: 1080,
      frameRate: '30000/1001',
      pixelFormat: 'yuv422p',
      videoFilters: ['scale=1280:1080', 'fps=30000/1001', 'format=yuv422p']
    }
  },
  {
    id: 'dvcprohd-1080i50',
    name: 'DVCPRO HD 1080i50',
    formatIds: ['mxf-op1a', 'quicktime', 'p2'],
    platforms: ['all'],
    video: {
      codec: 'dvvideo',
      width: 1440,
      height: 1080,
      frameRate: 25,
      pixelFormat: 'yuv422p',
      videoFilters: ['scale=1440:1080', 'fps=25', 'format=yuv422p']
    }
  },
  {
    id: 'dvcprohd-720p59',
    name: 'DVCPRO HD 720p59.94',
    formatIds: ['mxf-op1a', 'quicktime', 'p2'],
    platforms: ['all'],
    video: {
      codec: 'dvvideo',
      width: 960,
      height: 720,
      frameRate: '60000/1001',
      pixelFormat: 'yuv422p',
      videoFilters: ['scale=960:720', 'fps=60000/1001', 'format=yuv422p']
    }
  },
  {
    id: 'dvcprohd-720p50',
    name: 'DVCPRO HD 720p50',
    formatIds: ['mxf-op1a', 'quicktime', 'p2'],
    platforms: ['all'],
    video: {
      codec: 'dvvideo',
      width: 960,
      height: 720,
      frameRate: 50,
      pixelFormat: 'yuv422p',
      videoFilters: ['scale=960:720', 'fps=50', 'format=yuv422p']
    }
  },

  // —— AVC-Intra ——
  {
    id: 'avc-intra-50',
    name: 'AVC-Intra 50',
    formatIds: ['mxf-op1a', 'as11', 'p2'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      avcintraClass: 50,
      width: 1440,
      height: 1080,
      frameRate: 25,
      pixelFormat: 'yuv420p10le',
      videoFilters: ['scale=1440:1080', 'fps=25', 'format=yuv420p10le']
    }
  },
  {
    id: 'avc-intra-100',
    name: 'AVC-Intra 100',
    formatIds: ['mxf-op1a', 'as11', 'p2'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      avcintraClass: 100,
      width: 1920,
      height: 1080,
      frameRate: 25,
      pixelFormat: 'yuv422p10le',
      videoFilters: ['scale=1920:1080', 'fps=25', 'format=yuv422p10le']
    }
  },
  {
    id: 'avc-intra-200',
    name: 'AVC-Intra 200',
    formatIds: ['mxf-op1a', 'p2'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      avcintraClass: 200,
      width: 1920,
      height: 1080,
      frameRate: '30000/1001',
      pixelFormat: 'yuv422p10le',
      videoFilters: ['scale=1920:1080', 'fps=30000/1001', 'format=yuv422p10le']
    }
  },
  {
    id: 'avc-intra-300',
    name: 'AVC-Intra 300 (4K)',
    formatIds: ['mxf-op1a'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      avcintraClass: 300,
      width: 3840,
      height: 2160,
      frameRate: 25,
      pixelFormat: 'yuv422p10le',
      videoFilters: ['scale=3840:2160', 'fps=25', 'format=yuv422p10le']
    }
  },
  {
    id: 'avc-intra-480',
    name: 'AVC-Intra 480 (4K)',
    formatIds: ['mxf-op1a'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      avcintraClass: 480,
      width: 3840,
      height: 2160,
      frameRate: 25,
      pixelFormat: 'yuv422p10le',
      videoFilters: ['scale=3840:2160', 'fps=25', 'format=yuv422p10le']
    }
  },

  // —— XAVC (Long GOP approximations via High 422 / High) ——
  {
    id: 'xavc-intra',
    name: 'XAVC Intra',
    formatIds: ['mxf-op1a'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      avcintraClass: 100,
      profile: 'high422',
      pixelFormat: 'yuv422p10le',
      gop: 1,
      width: 1920,
      height: 1080,
      frameRate: 25,
      videoFilters: ['scale=1920:1080', 'fps=25', 'format=yuv422p10le']
    },
    notes: 'Open approximation of Sony XAVC Intra using AVC-Intra class encoding.'
  },
  {
    id: 'xavc-longgop-hd',
    name: 'XAVC Long GOP HD',
    formatIds: ['mxf-op1a'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      profile: 'high422',
      pixelFormat: 'yuv422p',
      bitrateMode: 'cbr',
      bitrateKbps: 50000,
      width: 1920,
      height: 1080,
      gop: 12
    },
    notes: 'Open Long-GOP approximation for XAVC HD workflows.'
  },
  {
    id: 'avc-longg',
    name: 'AVC-LongG',
    formatIds: ['mxf-op1a', 'p2'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      profile: 'high422',
      pixelFormat: 'yuv422p',
      bitrateMode: 'cbr',
      bitrateKbps: 25000,
      gop: 12
    }
  },

  // —— XDCAM / IMX ——
  {
    id: 'xdcamhd-18',
    name: 'XDCAM HD 18',
    formatIds: ['mxf-op1a', 'as10'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 18000,
      pixelFormat: 'yuv420p',
      width: 1440,
      height: 1080,
      gop: 12,
      videoFilters: ['scale=1440:1080']
    }
  },
  {
    id: 'xdcamhd-25',
    name: 'XDCAM HD 25',
    formatIds: ['mxf-op1a', 'as10'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 25000,
      pixelFormat: 'yuv420p',
      width: 1440,
      height: 1080,
      gop: 12,
      videoFilters: ['scale=1440:1080']
    }
  },
  {
    id: 'xdcamhd-35',
    name: 'XDCAM HD 35',
    formatIds: ['mxf-op1a', 'as10'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 35000,
      pixelFormat: 'yuv420p',
      width: 1440,
      height: 1080,
      gop: 12,
      videoFilters: ['scale=1440:1080']
    }
  },
  {
    id: 'xdcamhd-50',
    name: 'XDCAM HD 50',
    formatIds: ['mxf-op1a', 'as10'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 50000,
      pixelFormat: 'yuv422p',
      width: 1920,
      height: 1080,
      gop: 12,
      videoFilters: ['scale=1920:1080', 'format=yuv422p']
    }
  },
  {
    id: 'xdcamex-18',
    name: 'XDCAM EX 18',
    formatIds: ['mxf-op1a'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 18000,
      pixelFormat: 'yuv420p',
      width: 1280,
      height: 720,
      videoFilters: ['scale=1280:720']
    }
  },
  {
    id: 'xdcamex-35',
    name: 'XDCAM EX 35',
    formatIds: ['mxf-op1a'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 35000,
      pixelFormat: 'yuv420p',
      width: 1920,
      height: 1080,
      videoFilters: ['scale=1920:1080']
    }
  },
  {
    id: 'imx-30',
    name: 'IMX 30',
    formatIds: ['mxf-op1a', 'as11'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 30000,
      pixelFormat: 'yuv422p',
      width: 720,
      height: 608,
      gop: 1,
      videoFilters: ['scale=720:608', 'format=yuv422p']
    }
  },
  {
    id: 'imx-40',
    name: 'IMX 40',
    formatIds: ['mxf-op1a'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 40000,
      pixelFormat: 'yuv422p',
      width: 720,
      height: 608,
      gop: 1,
      videoFilters: ['scale=720:608', 'format=yuv422p']
    }
  },
  {
    id: 'imx-50',
    name: 'IMX 50',
    formatIds: ['mxf-op1a', 'as11'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 50000,
      pixelFormat: 'yuv422p',
      width: 720,
      height: 608,
      gop: 1,
      videoFilters: ['scale=720:608', 'format=yuv422p']
    }
  },

  // —— QuickTime / AVI uncompressed & animation ——
  {
    id: 'animation',
    name: 'Animation',
    formatIds: ['quicktime'],
    platforms: ['all'],
    video: { codec: 'qtrle', pixelFormat: 'rgba' }
  },
  {
    id: 'uncompressed-rgb',
    name: 'Uncompressed RGB',
    formatIds: ['quicktime', 'avi'],
    platforms: ['all'],
    video: { codec: 'rawvideo', pixelFormat: 'rgb24' }
  },
  {
    id: 'uncompressed-yuv',
    name: 'Uncompressed YUV',
    formatIds: ['quicktime', 'avi', 'avi-uncompressed'],
    platforms: ['all'],
    video: { codec: 'rawvideo', pixelFormat: 'uyvy422', tag: 'uyvy' }
  },
  {
    id: 'v210',
    name: 'V210',
    formatIds: ['quicktime', 'avi', 'avi-uncompressed'],
    platforms: ['all'],
    video: { codec: 'v210', pixelFormat: 'yuv422p10le' }
  },
  {
    id: 'none-video',
    name: 'None (audio / pass-through container)',
    formatIds: ['quicktime', 'avi'],
    platforms: ['all'],
    video: { codec: 'copy' }
  },

  // —— Windows Media ——
  {
    id: 'wmv7',
    name: 'Windows Media Video V7',
    formatIds: ['windows-media'],
    platforms: ['all'],
    video: { codec: 'wmv1', bitrateMode: 'cbr', bitrateKbps: 2000 }
  },
  {
    id: 'wmv8',
    name: 'Windows Media Video V8',
    formatIds: ['windows-media'],
    platforms: ['all'],
    video: { codec: 'wmv2', bitrateMode: 'cbr', bitrateKbps: 2000 }
  },

  // —— MPEG-2 / MPEG-4 ——
  {
    id: 'mpeg2-main',
    name: 'MPEG-2 Main',
    formatIds: ['mpeg2', 'mpeg2-bluray', 'mpeg2-dvd'],
    platforms: ['all'],
    video: { codec: 'mpeg2video', bitrateMode: 'cbr', bitrateKbps: 8000, pixelFormat: 'yuv420p' }
  },
  {
    id: 'mpeg4-asp',
    name: 'MPEG-4 ASP',
    formatIds: ['mpeg4'],
    platforms: ['all'],
    video: { codec: 'mpeg4', bitrateMode: 'cbr', bitrateKbps: 5000, pixelFormat: 'yuv420p' }
  },

  // —— JPEG 2000 / DCP ——
  {
    id: 'jpeg2000',
    name: 'JPEG 2000',
    formatIds: ['jpeg2000-mxf', 'dcp'],
    platforms: ['all'],
    video: { codec: 'jpeg2000', pixelFormat: 'yuv422p10le' }
  },

  // —— Extra codecs ——
  {
    id: 'av1-main',
    name: 'AV1',
    formatIds: ['av1', 'mkv'],
    platforms: ['all'],
    video: { codec: 'libaom-av1', bitrateMode: 'crf', crf: 30, pixelFormat: 'yuv420p' }
  },
  {
    id: 'vp9',
    name: 'VP9',
    formatIds: ['vp9', 'mkv'],
    platforms: ['all'],
    video: { codec: 'libvpx-vp9', bitrateMode: 'crf', crf: 32, pixelFormat: 'yuv420p' }
  },
  {
    id: 'vp8',
    name: 'VP8',
    formatIds: ['vp8'],
    platforms: ['all'],
    video: { codec: 'libvpx', bitrateMode: 'crf', crf: 10, pixelFormat: 'yuv420p' }
  },
  {
    id: 'ffv1',
    name: 'FFV1',
    formatIds: ['ffv1', 'mkv'],
    platforms: ['all'],
    video: { codec: 'ffv1', pixelFormat: 'yuv422p10le', extraArgs: ['-level', '3'] }
  },
  {
    id: 'hap',
    name: 'Hap',
    formatIds: ['hap', 'quicktime'],
    platforms: ['all'],
    video: { codec: 'hap', pixelFormat: 'rgba' }
  },

  // —— Stills ——
  {
    id: 'png',
    name: 'PNG',
    formatIds: ['still-png'],
    platforms: ['all'],
    video: { codec: 'png' }
  },
  {
    id: 'jpeg',
    name: 'JPEG',
    formatIds: ['still-jpeg'],
    platforms: ['all'],
    video: { codec: 'mjpeg', quality: 2 }
  },
  {
    id: 'tiff',
    name: 'TIFF',
    formatIds: ['still-tiff'],
    platforms: ['all'],
    video: { codec: 'tiff' }
  },
  {
    id: 'tga',
    name: 'Targa',
    formatIds: ['still-tga'],
    platforms: ['all'],
    video: { codec: 'targa' }
  },
  {
    id: 'dpx',
    name: 'DPX',
    formatIds: ['still-dpx'],
    platforms: ['all'],
    video: { codec: 'dpx', pixelFormat: 'gbrp10le' }
  },
  {
    id: 'exr',
    name: 'OpenEXR',
    formatIds: ['still-exr'],
    platforms: ['all'],
    video: { codec: 'exr' }
  },
  {
    id: 'bmp',
    name: 'Bitmap',
    formatIds: ['still-bmp'],
    platforms: ['all'],
    video: { codec: 'bmp' }
  },
  {
    id: 'gif',
    name: 'GIF',
    formatIds: ['gif'],
    platforms: ['all'],
    video: { codec: 'gif' }
  },

  // —— Audio ——
  {
    id: 'aac-lc',
    name: 'AAC-LC',
    formatIds: ['audio-aac', 'h264', 'hevc'],
    platforms: ['all'],
    video: { codec: 'none' },
    audio: { enabled: true, codec: 'aac', bitrateKbps: 320, sampleRate: 48000, channels: 2 }
  },
  {
    id: 'mp3',
    name: 'MP3',
    formatIds: ['audio-mp3'],
    platforms: ['all'],
    video: { codec: 'none' },
    audio: { enabled: true, codec: 'libmp3lame', bitrateKbps: 320, sampleRate: 48000, channels: 2 }
  },
  {
    id: 'pcm-16',
    name: 'PCM 16-bit',
    formatIds: ['audio-wav', 'audio-aiff'],
    platforms: ['all'],
    video: { codec: 'none' },
    audio: { enabled: true, codec: 'pcm_s16le', sampleRate: 48000, channels: 2 }
  },
  {
    id: 'pcm-24',
    name: 'PCM 24-bit',
    formatIds: ['audio-wav', 'audio-aiff'],
    platforms: ['all'],
    video: { codec: 'none' },
    audio: { enabled: true, codec: 'pcm_s24le', sampleRate: 48000, channels: 2 }
  },
  {
    id: 'flac',
    name: 'FLAC',
    formatIds: ['audio-flac'],
    platforms: ['all'],
    video: { codec: 'none' },
    audio: { enabled: true, codec: 'flac', sampleRate: 48000, channels: 2 }
  },
  {
    id: 'opus',
    name: 'Opus',
    formatIds: ['audio-opus'],
    platforms: ['all'],
    video: { codec: 'none' },
    audio: { enabled: true, codec: 'libopus', bitrateKbps: 160, sampleRate: 48000, channels: 2 }
  }
]

export function getCodecVariant(id: string): CodecVariant | undefined {
  return CODEC_VARIANTS.find((c) => c.id === id)
}

