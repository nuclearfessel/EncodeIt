# Encode This

Open-source batch media encoder with an **Adobe Media Encoder / Shutter Encoder–style** queue and preset browser.

Cross-platform (**Windows, macOS, Linux**) via Electron + FFmpeg.

## Phase 1 (this release)

- Encoding queue with progress, start/stop, multi-select
- Preset browser grouped like AME System Presets
- Unified format/codec catalog spanning **Adobe Media Encoder**, **Shutter Encoder**, **Apple Compressor**, and **TMPGEnc** families (open FFmpeg mappings)
- Watch folders
- Hardware encode options (NVENC / QSV / AMF / VideoToolbox) when FFmpeg supports them

### Requirements

- Node.js 20+
- FFmpeg and FFprobe on `PATH` (or set paths in Settings)

### Develop

```bash
npm install
npm run dev
```

### Scripts

```bash
npm run typecheck
npm run catalog:stats
npm run build
```

## Catalog notes

Exact bit-for-bit clones of proprietary encoders/certified wrappers (full Dolby Vision, Wraptor DCP packages, DPP AS-11 metadata, TMPGEnc disc authoring) are **not** claimed. Broadcast formats use best-effort FFmpeg recipes labeled in the catalog.

## Phase 2 (separate branch)

Host integrations:

- After Effects send-to-queue panel / script
- DaVinci Resolve scripting handoff to Encode This

See `integrations/` on the `phase-2-integrations` branch.
