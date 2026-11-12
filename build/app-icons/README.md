# EncodeIt app icon handoff

**Supported platforms:** macOS, Windows, and Linux.

This folder contains only EncodeIt's approved icon artwork and platform assets. The icons are unmasked; each platform applies its own launcher shape. Platform-specific usage instructions are in the `README.md` inside each platform folder.

## Contents

- `Apple/macOS/` — Mac asset catalog, `.icns`, and full-square masters.
- `Windows/` — MSIX package, tile, AppList, and `.ico` assets.
- `Linux/` — scalable SVG, hicolor PNGs, `.DirIcon`, and desktop-entry example.
- `Artwork/` — approved transparent/vector and full-color source artwork.

## Before integrating

- Back up existing app icon resources, then replace only the matching icon assets.
- Keep each platform's related XML, colors, and resource files together.
- Verify the result in the target platform's native build and preview tools.
- No app source, store listing, or store submission was changed by this handoff.
