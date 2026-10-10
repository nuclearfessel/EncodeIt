# Encode This

Open-source batch media encoder with an **Adobe Media Encoder / Shutter Encoder–style** queue and preset browser.

Cross-platform (**Windows, macOS, Linux**) via Electron + FFmpeg.

## Phase 1

- Encoding queue with progress, start/stop, multi-select
- Preset browser grouped like AME System Presets
- Unified format/codec catalog spanning **Adobe Media Encoder**, **Shutter Encoder**, **Apple Compressor**, and **TMPGEnc** families (open FFmpeg mappings)
- Watch folders
- Hardware encode options (NVENC / QSV / AMF / VideoToolbox) when FFmpeg supports them

### Requirements

- Node.js 20+
- FFmpeg/FFprobe are **bundled** (downloaded on `npm install` / `npm run download-ffmpeg` and shipped inside installers via `extraResources`)

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

### Catalog notes

Exact bit-for-bit clones of proprietary encoders/certified wrappers (full Dolby Vision, Wraptor DCP packages, DPP AS-11 metadata, TMPGEnc disc authoring) are **not** claimed. Broadcast formats use best-effort FFmpeg recipes labeled in the catalog.

## Phase 2 — host integrations

| Integration | Location | Mechanism |
| --- | --- | --- |
| **Watch folders** (primary) | Preferences → Integrations | AE / Resolve / any app renders into a watched folder (Windows & macOS) |
| Local intake API | Preferences → Integrations (`127.0.0.1:47821`) | Optional `POST /queue/add`, `GET /presets`, inbox |
| After Effects | [`integrations/after-effects`](integrations/after-effects) | Watch folder; optional ExtendScript / CEP |
| Premiere Pro | [`integrations/premiere`](integrations/premiere) | Watch folder or ExtendScript |
| DaVinci Resolve | [`integrations/davinci-resolve`](integrations/davinci-resolve) | Watch folder; optional Python |

**Shipped:** persistent watch folders UI, intake API, AE CEP packaging (`npm run package:cep`).  
**Later:** Premiere native exporter, automated ZXP signing in CI.

```bash
# Optional: queue a file via intake while Encode This is running
curl -X POST http://127.0.0.1:47821/queue/add \
  -H "Content-Type: application/json" \
  -d '{"paths":["/path/to/clip.mp4"],"presetId":"h264-match-source-high-bitrate","start":true}'
```
