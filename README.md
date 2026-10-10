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

## Phase 2 — host integrations (in progress)

On branch `phase-2-integrations`:

| Integration | Location | Mechanism |
| --- | --- | --- |
| Local intake API | Preferences → Integrations (`127.0.0.1:47821`) | `POST /queue/add`, `GET /presets`, `GET /health`, inbox folder |
| After Effects | [`integrations/after-effects`](integrations/after-effects) | ExtendScript + CEP panel (loads presets from intake) |
| DaVinci Resolve | [`integrations/davinci-resolve`](integrations/davinci-resolve) | Python Utility / CLI handoff |

**Now:** live intake status in Preferences, AE CEP preset list from `GET /presets`.  
**Next:** Premiere exporter path, richer Resolve Deliver handoff, signed CEP packaging.

```bash
# Example: queue a file while Encode This is running
curl -X POST http://127.0.0.1:47821/queue/add ^
  -H "Content-Type: application/json" ^
  -d "{\"paths\":[\"D:/media/clip.mp4\"],\"presetId\":\"h264-match-source-high-bitrate\",\"start\":true}"
```

Resolve cannot replace Deliver codecs via plugin SDK; AE integration sends rendered media into this queue (Premiere exporter plugin can come later).
