/**
 * Copy EncodeIt's themed assistedInstaller.nsh over electron-builder's template.
 * Custom nsis.script is avoided — it skips uninstaller generation and breaks Windows builds.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(ROOT, 'build/assistedInstaller.nsh')
const require = createRequire(import.meta.url)
const builderLib = path.dirname(require.resolve('app-builder-lib/package.json'))
const dest = path.join(builderLib, 'templates/nsis/assistedInstaller.nsh')

if (!fs.existsSync(src)) {
  console.error('[patch-nsis-assisted] missing', src)
  process.exit(1)
}
fs.copyFileSync(src, dest)
console.log('[patch-nsis-assisted] patched', dest)
