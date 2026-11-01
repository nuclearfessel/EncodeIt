import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import pngToIco from 'png-to-ico'

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
  if (buf[0] !== 0x89) throw new Error('not a png')
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
    } else if (type === 'IDAT') {
      idats.push(data)
    } else if (type === 'IEND') {
      break
    }
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

function resizeNearest(src, sw, sh, tw, th) {
  const out = Buffer.alloc(tw * th * 4)
  for (let y = 0; y < th; y++) {
    const sy = Math.min(sh - 1, Math.floor(((y + 0.5) * sh) / th))
    for (let x = 0; x < tw; x++) {
      const sx = Math.min(sw - 1, Math.floor(((x + 0.5) * sw) / tw))
      const si = (sy * sw + sx) * 4
      const di = (y * tw + x) * 4
      out[di] = src[si]
      out[di + 1] = src[si + 1]
      out[di + 2] = src[si + 2]
      out[di + 3] = src[si + 3]
    }
  }
  return out
}

function opaqueStats(rgba) {
  let opaque = 0
  let sumA = 0
  for (let i = 3; i < rgba.length; i += 4) {
    const a = rgba[i]
    sumA += a
    if (a > 20) opaque++
  }
  return { opaque, avgA: sumA / (rgba.length / 4) }
}

const srcPath =
  process.argv[2] ||
  path.resolve(
    'C:/Users/bitte/.cursor/projects/d-ClaudeLocalExperiments-EncodeIt/assets/media-codec-universal-521d8bf0-8229-4274-89b3-034babbee43c.png'
  )

const srcBuf = fs.readFileSync(srcPath)
const { w, h, rgba } = decodePng(srcBuf)
console.log('source', { w, h, ...opaqueStats(rgba), bytes: srcBuf.length })

fs.mkdirSync('docs/assets', { recursive: true })
fs.mkdirSync('src/renderer/src/assets', { recursive: true })
fs.mkdirSync('resources', { recursive: true })
fs.mkdirSync('build', { recursive: true })

fs.writeFileSync('src/renderer/src/assets/encodeit-logo.png', srcBuf)
fs.writeFileSync('docs/assets/encodeit-logo.png', srcBuf)

const sizes = {
  16: null,
  24: null,
  32: null,
  48: null,
  64: null,
  128: null,
  256: null,
  512: null
}
for (const size of Object.keys(sizes).map(Number)) {
  const resized = resizeNearest(rgba, w, h, size, size)
  const png = encodePng(size, size, resized)
  sizes[size] = png
  console.log(`size ${size}`, opaqueStats(resized), 'bytes', png.length)
}

fs.writeFileSync('resources/icon.png', sizes[512])
fs.writeFileSync('build/icon.png', sizes[512])
fs.writeFileSync('docs/assets/encodeit-logo-256.png', sizes[256])

const ico = await pngToIco([
  sizes[16],
  sizes[24],
  sizes[32],
  sizes[48],
  sizes[64],
  sizes[128],
  sizes[256]
])
fs.writeFileSync('build/icon.ico', ico)
console.log('wrote icon.ico', ico.length)

const b64 = sizes[256].toString('base64')
const dataUri = `data:image/png;base64,${b64}`
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="EncodeIt">
  <image width="256" height="256" href="${dataUri}"/>
</svg>
`

fs.writeFileSync('docs/assets/encodeit-logo.svg', logoSvg)
fs.writeFileSync('src/renderer/src/assets/encodeit-logo.svg', logoSvg)
console.log('brand assets refreshed')
