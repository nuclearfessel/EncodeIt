import { app, nativeImage, type NativeImage } from 'electron'
import fs from 'fs'
import path from 'path'

/**
 * Dev: repo `build/icon.ico` (Windows) or `resources/icon.png`.
 * Packaged: `icon.png` / `icon.ico` under process.resourcesPath.
 */
export function resolveAppIconPath(): string {
  const base = app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, '../..')

  if (process.platform === 'win32') {
    const ico = path.join(base, app.isPackaged ? 'icon.ico' : 'build/icon.ico')
    if (fs.existsSync(ico)) return ico
  }

  const png = path.join(base, app.isPackaged ? 'icon.png' : 'resources/icon.png')
  return png
}

export function loadAppIcon(): NativeImage | undefined {
  const file = resolveAppIconPath()
  if (!fs.existsSync(file)) return undefined
  const image = nativeImage.createFromPath(file)
  return image.isEmpty() ? undefined : image
}
