# DaVinci Resolve → Encode This

Resolve does not expose a public “replace Deliver codecs” plugin API. Phase 2 integrates by **scripting**: render (or pick media), then hand paths to Encode This over the local intake API.

## Requirements

- DaVinci Resolve Studio is recommended for external scripting; free Resolve supports limited scripting depending on version/OS.
- Encode This running with **Host intake** enabled (`http://127.0.0.1:47821`)
- Python 3.9+

## Quick use

```bash
# After Resolve has rendered a file (or you already have media):
python send_to_encode_this.py --path "D:\renders\timeline.mov" --preset h264-match-source-high-bitrate --start

# List presets from a running Encode This instance:
python send_to_encode_this.py --list-presets
```

## Resolve menu script

1. Copy `send_to_encode_this.py` into your Resolve scripts folder, or run it from Workspace → Scripts after installing into:

   - Windows: `%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility\`
   - macOS: `~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/`
   - Linux: `~/.local/share/DaVinciResolve/Fusion/Scripts/Utility/`

2. **Deliver handoff:** run `resolve_deliver_handoff.py` from Resolve’s Utility scripts (or CLI). It lists the render queue, picks a job, and sends the output file when it exists on disk:

   ```bash
   python resolve_deliver_handoff.py --list-jobs
   python resolve_deliver_handoff.py --job-id <JobId> --preset h264-match-source-high-bitrate
   ```

## Workflow tips

1. Deliver once from Resolve to a high-quality intermediate (or your preferred master).
2. Send that file into Encode This for the large preset catalog (social, broadcast MXF, ProRes ladders, etc.).
3. Or watch-folder: point Encode This at your Resolve render directory.

## Limits

- Cannot inject custom codecs into Resolve’s Deliver page UI.
- OFX plugins are for effects, not encoding.
- Full timeline “direct encode without Deliver” would require Studio scripting + render job APIs and varies by Resolve version.
