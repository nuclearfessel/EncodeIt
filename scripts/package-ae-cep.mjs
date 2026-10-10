#!/usr/bin/env node
/**
 * Pack the After Effects CEP panel into a zip for manual install or signing.
 * Output: release/encode-this-ae-cep.zip (extension root = encode-this-ae/)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { cpSync, mkdirSync, rmSync } from 'fs'
import { execFileSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const cepSrc = path.join(root, 'integrations', 'after-effects', 'cep')
const outDir = path.join(root, 'release')
const outZip = path.join(outDir, 'encode-this-ae-cep.zip')
const bundleName = 'encode-this-ae'

function assertCepLayout() {
  const manifest = path.join(cepSrc, 'CSXS', 'manifest.xml')
  if (!fs.existsSync(manifest)) {
    throw new Error(`Missing CEP manifest: ${manifest}`)
  }
}

function zipCep() {
  assertCepLayout()
  mkdirSync(outDir, { recursive: true })
  if (fs.existsSync(outZip)) rmSync(outZip)

  const stagingRoot = path.join(outDir, '.cep-staging')
  const staging = path.join(stagingRoot, bundleName)
  rmSync(stagingRoot, { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })
  cpSync(cepSrc, staging, { recursive: true })

  if (process.platform === 'win32') {
    const ps = [
      '-NoProfile',
      '-Command',
      `Compress-Archive -LiteralPath '${staging.replace(/'/g, "''")}' -DestinationPath '${outZip.replace(/'/g, "''")}' -Force`
    ]
    execFileSync('powershell.exe', ps, { stdio: 'inherit' })
  } else {
    execFileSync('zip', ['-r', outZip, bundleName], { cwd: stagingRoot, stdio: 'inherit' })
  }

  rmSync(stagingRoot, { recursive: true, force: true })

  const stat = fs.statSync(outZip)
  console.log(`Wrote ${outZip} (${stat.size} bytes)`)
  console.log('')
  console.log('Install (unsigned / debug):')
  console.log('  Windows: %APPDATA%\\Adobe\\CEP\\extensions\\encode-this-ae')
  console.log('  macOS: ~/Library/Application Support/Adobe/CEP/extensions/encode-this-ae')
  console.log('  Unzip so manifest lives at .../encode-this-ae/CSXS/manifest.xml')
  console.log('')
  console.log('Signing: see integrations/after-effects/cep/PACKAGING.md')
}

try {
  zipCep()
} catch (err) {
  console.error(err)
  process.exit(1)
}
