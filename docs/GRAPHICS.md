# EncodeIt graphics pack

Static, self-contained documentation artwork for [EncodeIt](https://github.com/nuclearfessel/EncodeIt). These are documentation graphics, not application screenshots.

## Files

Each artwork is provided as an SVG and a PNG with the same base name.

| Base filename | Dimensions | Purpose |
| --- | --- | --- |
| `logo-grayscale` | 1024 × 1024 | Transparent, achromatic ribbon with shaded folds |
| `logo-black` | 1024 × 1024 | Transparent, true black single-ink silhouette |
| `logo-white` | 1024 × 1024 | Transparent, true white single-ink silhouette |
| `readme-banner-light` | 1600 × 520 | Banner for light backgrounds |
| `readme-banner-dark` | 1600 × 520 | Banner for dark backgrounds |
| `workflow-light` | 1600 × 560 | Four-step workflow, light |
| `workflow-dark` | 1600 × 560 | Four-step workflow, dark |
| `integrations-light` | 1600 × 680 | Watch folder handoff, light |
| `integrations-dark` | 1600 × 680 | Watch folder handoff, dark |

`preview-contact-sheet.png` is a review-only composite, 1600 pixels wide. It is not intended for embedding in the README. `encodeit-brand-pack.zip` packages the artwork and this guide.

## Repository destination

Canonical artwork lives under `docs/assets/brand/` (`Brand/`, `Graphics/`,
`Fonts/`, `Licenses/`, `Web/`). Legacy filenames under `docs/assets/` remain as
aliases for older links. Use the SVGs for crisp, resolution-independent GitHub
display. The following snippets assume a README at the repository root. In
`docs/USER_GUIDE.md`, change every `docs/assets/brand/` prefix to
`assets/brand/`.

### Theme-aware banner

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/Graphics/readme-banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/brand/Graphics/readme-banner-light.svg">
  <img src="docs/assets/brand/Graphics/readme-banner-light.svg" alt="EncodeIt — Open-source batch media encoding. Powered by FFmpeg. Windows, macOS, and Linux." width="100%">
</picture>
```

### Theme-aware workflow

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/Graphics/workflow-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/brand/Graphics/workflow-light.svg">
  <img src="docs/assets/brand/Graphics/workflow-light.svg" alt="EncodeIt workflow: add media, choose a preset, start the queue, then deliver encoded files to your chosen output path." width="100%">
</picture>
```

### Theme-aware integrations

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/Graphics/integrations-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/brand/Graphics/integrations-light.svg">
  <img src="docs/assets/brand/Graphics/integrations-light.svg" alt="After Effects, Premiere Pro, and DaVinci Resolve export to watch folders. After files settle, the EncodeIt queue uses FFmpeg to encode them to Output. EncodeIt processes files after the host finishes exporting; it is not a native host codec replacement." width="100%">
</picture>
```

The light `<img>` supplies the fallback when media sources are not supported. Replace `.svg` with `.png` throughout any snippet if raster assets are required. Browser color-scheme preference controls these media queries; this may differ from a manually selected GitHub appearance.

## Monochrome logo use

The three logos preserve the approved ribbon paths, proportions, and transparent play-shaped opening. No new mark has been drawn. Single-ink versions intentionally merge the folded faces into a flat silhouette. The grayscale version retains those folds with achromatic shading.

- Use `logo-black.svg` on pale surfaces.
- Use `logo-white.svg` on dark surfaces.
- Use `logo-grayscale.svg` when tonal reproduction is available.
- Keep the transparent area transparent. Do not fill the play opening or add a background to the logo asset.
- Preserve aspect ratio and the built-in clear space; do not stretch, recolor individual faces, or crop the ribbon.
- Prefer at least 48 CSS pixels square; use a larger mark when the folds need to be visible.

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/Brand/logo-white.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/brand/Brand/logo-black.svg">
  <img src="docs/assets/brand/Brand/logo-black.svg" alt="EncodeIt" width="112" height="112">
</picture>
```

## App icons (OS packages)

Platform app icons live under `build/app-icons/` (Windows `.ico`, macOS `.icns` + asset catalog, Linux hicolor, plus `Artwork/` masters). Wire them into Electron build destinations with:

```bash
npm run sync:app-icons
npm run regen:installer-art
```

`sync:app-icons` updates `build/icon.ico` / `icon.icns` / `icon.png`, `build/icons/` (Linux), installer/uninstaller `.ico`, `resources/icon.png`, and the in-app / docs `encodeit-logo` assets. `regen:installer-art` rebuilds NSIS sidebar/header BMPs from the Artwork master without overwriting the platform-native icons.

## Visual system and production notes

Precise editorial layout, graphite surfaces, restrained vermillion accents, and quiet production-tool typography. DejaVu Sans regular/bold and DejaVu Sans Mono were taken from locally installed fonts. All visible typography is converted to vector paths: the SVGs require no external fonts, stylesheets, linked images, or network resources. SVG titles, descriptions, and text-group labels preserve textual context; use the supplied HTML alt text when embedding as images.

| Theme | Background | Panels | Text | Accent | Strong accent |
| --- | --- | --- | --- | --- | --- |
| Light | `#d5d7db` | `#eceef1` | `#141618` | `#b12f28` | `#8f241f` |
| Dark | `#101214` | `#171a1d` | `#e9ecef` | `#e58a84` | `#d06e68` |

The banner retains the approved full-color ribbon, including its original shading. The diagrams describe the verified file-based workflow, queue progress, and presets. They do not claim native codec replacement, certified delivery formats, or universal hardware acceleration. Hardware acceleration, when described elsewhere, depends on FFmpeg and the available hardware.
