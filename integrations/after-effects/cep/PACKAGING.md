# CEP packaging & signing

## Dev install (unsigned)

1. Enable CEP debug mode for your AE major version (Adobe CEP HTML Extension Cookbook).
2. Copy or symlink the `cep/` folder to:

   - Windows: `%APPDATA%\Adobe\CEP\extensions\encode-this-ae`
   - macOS: `~/Library/Application Support/Adobe/CEP/extensions/encode-this-ae`

3. Restart After Effects → **Window → Encode This**.

## Release zip

From the repo root:

```bash
npm run package:cep
```

Creates `release/encode-this-ae-cep.zip` with top-level folder `encode-this-ae/` (required by CEP).

## Signing for production

Adobe expects extensions distributed outside debug mode to be **signed** (`.zxp` or properly signed bundle).

Typical workflow:

1. Build the zip with `npm run package:cep`.
2. Sign with **ZXPSignCmd** (Creative Cloud SDK) or your org’s code-signing cert:

   ```text
   ZXPSignCmd -sign release/encode-this-ae-cep.zip release/encode-this-ae.zxp your.p12 password
   ```

3. Install via **ExManCmd**, Anastasiy’s Extension Manager, or enterprise deployment tools.

This repo does not ship certificates or automate signing (certificates are org-specific). For internal builds, unsigned + debug mode is enough; for wide distribution, add signing in CI once you have a cert.

## Version bumps

Update `ExtensionBundleVersion` in `CSXS/manifest.xml` and the `<Extension Version="...">` entry when releasing.
