/**
 * Wire platform icon handoff (build/app-icons) into Electron/build destinations.
 *
 * Source pack layout (from Icons/EncodeIt handoff):
 *   Apple/macOS/EncodeIt.icns
 *   Windows/encodeit-windows.ico
 *   Linux/hicolor/<size>/apps/encodeit.png
 *   Artwork/foreground-1024.{png,svg}  (transparent in-app / docs mark)
 *   Artwork/encodeit-app-store-1024.png (NSIS BMP source via regen:installer-art)
 *
 * Destinations:
 *   build/icon.icns, build/icon.ico, build/icon.png
 *   build/installerIcon.ico, build/uninstallerIcon.ico
 *   build/icons/<size>x<size>.png  (electron-builder Linux)
 *   resources/icon.png
 *   src/renderer + docs encodeit-logo.{png,svg}
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PACK = path.join(ROOT, 'build', 'app-icons')

function mustExist(p) {
  if (!fs.existsSync(p)) throw new Error(`missing icon source: ${p}`)
  return p
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to)
  console.log('→', path.relative(ROOT, to))
}

const winIco = mustExist(path.join(PACK, 'Windows', 'encodeit-windows.ico'))
const macIcns = mustExist(path.join(PACK, 'Apple', 'macOS', 'EncodeIt.icns'))
const linux512 = mustExist(path.join(PACK, 'Linux', 'hicolor', '512x512', 'apps', 'encodeit.png'))
const logoPng = mustExist(path.join(PACK, 'Artwork', 'foreground-1024.png'))
const logoSvg = mustExist(path.join(PACK, 'Artwork', 'foreground-1024.svg'))

copyFile(winIco, path.join(ROOT, 'build', 'icon.ico'))
copyFile(winIco, path.join(ROOT, 'build', 'installerIcon.ico'))
copyFile(winIco, path.join(ROOT, 'build', 'uninstallerIcon.ico'))
copyFile(macIcns, path.join(ROOT, 'build', 'icon.icns'))
copyFile(linux512, path.join(ROOT, 'build', 'icon.png'))
copyFile(linux512, path.join(ROOT, 'resources', 'icon.png'))

const linuxSizes = [16, 22, 24, 32, 48, 64, 128, 256, 512]
const iconsDir = path.join(ROOT, 'build', 'icons')
fs.mkdirSync(iconsDir, { recursive: true })
for (const size of linuxSizes) {
  const src = mustExist(
    path.join(PACK, 'Linux', 'hicolor', `${size}x${size}`, 'apps', 'encodeit.png')
  )
  copyFile(src, path.join(iconsDir, `${size}x${size}.png`))
}

copyFile(logoPng, path.join(ROOT, 'src', 'renderer', 'src', 'assets', 'encodeit-logo.png'))
copyFile(logoPng, path.join(ROOT, 'docs', 'assets', 'encodeit-logo.png'))
copyFile(logoSvg, path.join(ROOT, 'src', 'renderer', 'src', 'assets', 'encodeit-logo.svg'))
copyFile(logoSvg, path.join(ROOT, 'docs', 'assets', 'encodeit-logo.svg'))

console.log('synced app icons from build/app-icons')
