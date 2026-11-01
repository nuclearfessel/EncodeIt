/**
 * Regenerate Windows installer branding + sharper app icons from the color logo.
 * - build/icon.png, resources/icon.png (512)
 * - build/icon.ico (multi-size)
 * - build/installerSidebar.bmp (164×314, 24-bit)
 * - build/installerHeader.bmp (150×57, 24-bit)
 *
 * Palette matches the app dark theme (asphalt + soft coral).
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import pngToIco from 'png-to-ico'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const LOGO =
  process.argv[2] ||
  path.join(ROOT, 'src/renderer/src/assets/encodeit-logo.png')

const BG = { r: 0x10, g: 0x12, b: 0x14 }
const PANEL = { r: 0x17, g: 0x1a, b: 0x1d }
const ELEV = { r: 0x21, g: 0x25, b: 0x29 }
const ACCENT = { r: 0xe5, g: 0x8a, b: 0x84 }
const ACCENT_STRONG = { r: 0xd0, g: 0x6e, b: 0x68 }

function crcTable() {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
}
const CRC_TABLE = crcTable()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

function decodePng(buf) {
  let w
  let h
  let bitDepth
  let colorType
  const idats = []
  let i = 8
  while (i < buf.length) {
    const len = buf.readUInt32BE(i)
    const type = buf.slice(i + 4, i + 8).toString('ascii')
    const data = buf.slice(i + 8, i + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0)
      h = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') idats.push(data)
    else if (type === 'IEND') break
    i += 12 + len
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`unsupported png ct=${colorType} bd=${bitDepth}`)
  }
  const bpp = colorType === 6 ? 4 : 3
  const raw = zlib.inflateSync(Buffer.concat(idats))
  const stride = w * bpp
  const rgba = Buffer.alloc(w * h * 4)
  let prev = Buffer.alloc(stride)
  let offset = 0
  for (let y = 0; y < h; y++) {
    const filter = raw[offset++]
    const row = Buffer.alloc(stride)
    for (let x = 0; x < stride; x++) {
      const v = raw[offset++]
      const left = x >= bpp ? row[x - bpp] : 0
      const up = prev[x]
      const upLeft = x >= bpp ? prev[x - bpp] : 0
      if (filter === 0) row[x] = v
      else if (filter === 1) row[x] = (v + left) & 255
      else if (filter === 2) row[x] = (v + up) & 255
      else if (filter === 3) row[x] = (v + ((left + up) >> 1)) & 255
      else if (filter === 4) row[x] = (v + paeth(left, up, upLeft)) & 255
      else throw new Error(`bad filter ${filter}`)
    }
    for (let x = 0; x < w; x++) {
      const si = x * bpp
      const di = (y * w + x) * 4
      rgba[di] = row[si]
      rgba[di + 1] = row[si + 1]
      rgba[di + 2] = row[si + 2]
      rgba[di + 3] = bpp === 4 ? row[si + 3] : 255
    }
    prev = row
  }
  return { w, h, rgba }
}

function encodePng(w, h, rgba) {
  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const chunk = (type, data) => {
    const typeBuf = Buffer.from(type)
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
    return Buffer.concat([len, typeBuf, data, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/** Bilinear resize — much cleaner than nearest for small ICO sizes. */
function resizeBilinear(src, sw, sh, tw, th) {
  const out = Buffer.alloc(tw * th * 4)
  for (let y = 0; y < th; y++) {
    const sy = ((y + 0.5) * sh) / th - 0.5
    const y0 = Math.max(0, Math.floor(sy))
    const y1 = Math.min(sh - 1, y0 + 1)
    const fy = sy - y0
    for (let x = 0; x < tw; x++) {
      const sx = ((x + 0.5) * sw) / tw - 0.5
      const x0 = Math.max(0, Math.floor(sx))
      const x1 = Math.min(sw - 1, x0 + 1)
      const fx = sx - x0
      const di = (y * tw + x) * 4
      for (let c = 0; c < 4; c++) {
        const a = src[(y0 * sw + x0) * 4 + c]
        const b = src[(y0 * sw + x1) * 4 + c]
        const d = src[(y1 * sw + x0) * 4 + c]
        const e = src[(y1 * sw + x1) * 4 + c]
        const top = a + (b - a) * fx
        const bot = d + (e - d) * fx
        out[di + c] = Math.round(top + (bot - top) * fy)
      }
    }
  }
  return out
}

function createRgb(w, h, color) {
  const buf = Buffer.alloc(w * h * 3)
  for (let i = 0; i < w * h; i++) {
    buf[i * 3] = color.r
    buf[i * 3 + 1] = color.g
    buf[i * 3 + 2] = color.b
  }
  return { w, h, rgb: buf }
}

function fillRect(img, x0, y0, x1, y1, color) {
  const { w, h, rgb } = img
  for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
      const i = (y * w + x) * 3
      rgb[i] = color.r
      rgb[i + 1] = color.g
      rgb[i + 2] = color.b
    }
  }
}

function lerpColor(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t)
  }
}

function verticalGradient(img, top, bot) {
  for (let y = 0; y < img.h; y++) {
    const c = lerpColor(top, bot, y / Math.max(1, img.h - 1))
    fillRect(img, 0, y, img.w, y + 1, c)
  }
}

/** Composite RGBA logo onto RGB canvas with alpha blend. */
function pasteRgba(img, rgba, sw, sh, dx, dy, dw, dh) {
  const scaled = dw === sw && dh === sh ? rgba : resizeBilinear(rgba, sw, sh, dw, dh)
  for (let y = 0; y < dh; y++) {
    const py = dy + y
    if (py < 0 || py >= img.h) continue
    for (let x = 0; x < dw; x++) {
      const px = dx + x
      if (px < 0 || px >= img.w) continue
      const si = (y * dw + x) * 4
      const a = scaled[si + 3] / 255
      if (a < 0.01) continue
      const di = (py * img.w + px) * 3
      img.rgb[di] = Math.round(scaled[si] * a + img.rgb[di] * (1 - a))
      img.rgb[di + 1] = Math.round(scaled[si + 1] * a + img.rgb[di + 1] * (1 - a))
      img.rgb[di + 2] = Math.round(scaled[si + 2] * a + img.rgb[di + 2] * (1 - a))
    }
  }
}

/** 24-bit uncompressed BMP (bottom-up rows) — required by NSIS MUI. */
function encodeBmp24(img) {
  const { w, h, rgb } = img
  const rowSize = Math.ceil((w * 3) / 4) * 4
  const pixelBytes = rowSize * h
  const file = Buffer.alloc(54 + pixelBytes)
  file.write('BM', 0)
  file.writeUInt32LE(54 + pixelBytes, 2)
  file.writeUInt32LE(0, 6)
  file.writeUInt32LE(54, 10)
  file.writeUInt32LE(40, 14)
  file.writeInt32LE(w, 18)
  file.writeInt32LE(h, 22) // positive = bottom-up
  file.writeUInt16LE(1, 26)
  file.writeUInt16LE(24, 28)
  file.writeUInt32LE(0, 30)
  file.writeUInt32LE(pixelBytes, 34)
  file.writeInt32LE(2835, 38)
  file.writeInt32LE(2835, 42)
  for (let y = 0; y < h; y++) {
    const srcY = h - 1 - y
    const dest = 54 + y * rowSize
    for (let x = 0; x < w; x++) {
      const si = (srcY * w + x) * 3
      const di = dest + x * 3
      // BMP is BGR
      file[di] = rgb[si + 2]
      file[di + 1] = rgb[si + 1]
      file[di + 2] = rgb[si]
    }
  }
  return file
}

function makeSidebar(logoRgba, lw, lh) {
  const img = createRgb(164, 314, BG)
  verticalGradient(img, BG, PANEL)
  // Accent rail
  fillRect(img, 0, 0, 5, 314, ACCENT)
  // Elevated mark panel
  fillRect(img, 22, 48, 142, 178, ELEV)
  fillRect(img, 22, 178, 142, 183, ACCENT_STRONG)
  const mark = 108
  pasteRgba(img, logoRgba, lw, lh, Math.round((164 - mark) / 2), 58, mark, mark)
  // Quiet geometric footer — no bitmap font (NSIS title already says EncodeIt)
  fillRect(img, 22, 220, 142, 221, { r: 0x2c, g: 0x31, b: 0x36 })
  fillRect(img, 22, 248, 70, 252, ACCENT)
  fillRect(img, 78, 248, 142, 252, ACCENT_STRONG)
  fillRect(img, 22, 280, 142, 284, ACCENT)
  return img
}

function makeHeader(logoRgba, lw, lh) {
  const img = createRgb(150, 57, PANEL)
  verticalGradient(img, ELEV, PANEL)
  fillRect(img, 0, 0, 150, 3, ACCENT)
  fillRect(img, 0, 54, 150, 57, ACCENT_STRONG)
  const mark = 42
  pasteRgba(img, logoRgba, lw, lh, 12, 7, mark, mark)
  // Accent chip instead of pixel text
  fillRect(img, 64, 22, 138, 26, ACCENT)
  fillRect(img, 64, 30, 110, 34, ACCENT_STRONG)
  return img
}

const srcBuf = fs.readFileSync(LOGO)
const { w, h, rgba } = decodePng(srcBuf)
console.log('logo', { w, h, path: LOGO })

fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true })
fs.mkdirSync(path.join(ROOT, 'resources'), { recursive: true })

const png512 = encodePng(512, 512, resizeBilinear(rgba, w, h, 512, 512))
fs.writeFileSync(path.join(ROOT, 'build/icon.png'), png512)
fs.writeFileSync(path.join(ROOT, 'resources/icon.png'), png512)

const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const icoPngs = icoSizes.map((s) => encodePng(s, s, resizeBilinear(rgba, w, h, s, s)))
const ico = await pngToIco(icoPngs)
fs.writeFileSync(path.join(ROOT, 'build/icon.ico'), ico)
fs.writeFileSync(path.join(ROOT, 'build/installerIcon.ico'), ico)
fs.writeFileSync(path.join(ROOT, 'build/uninstallerIcon.ico'), ico)
console.log('wrote icon.ico', ico.length)

const sidebar = makeSidebar(rgba, w, h)
const header = makeHeader(rgba, w, h)
fs.writeFileSync(path.join(ROOT, 'build/installerSidebar.bmp'), encodeBmp24(sidebar))
fs.writeFileSync(path.join(ROOT, 'build/uninstallerSidebar.bmp'), encodeBmp24(sidebar))
fs.writeFileSync(path.join(ROOT, 'build/installerHeader.bmp'), encodeBmp24(header))
console.log('wrote installer BMP branding')
