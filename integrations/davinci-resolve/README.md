# DaVinci Resolve → Encode This

Resolve does not expose a public “replace Deliver codecs” plugin API. The supported workaround on **Windows and macOS** is to Deliver into a folder Encode This watches.

## Watch folder (primary)

1. Create a shared Deliver folder, e.g.:
   - Windows: `D:\EncodeThis\from-resolve`
   - macOS: `~/Movies/EncodeThis/from-resolve`
2. In Encode This: **Edit → Preferences → Integrations → Watch folders**
   - Choose a preset and encode output folder
   - **Add watch folder…** and select the shared folder
3. In Resolve **Deliver**, set the render destination to that same folder.
4. Deliver as usual (prefer a high-quality intermediate / master). Encode This queues new files and starts encoding.

Existing files already in the folder when you add or enable a watch are ignored — only **new** arrivals are queued.

Encode This must be running while Resolve writes into the watched folder.

## Optional — Python CLI / Utility scripts

Use only if you need a one-off send or Deliver-queue handoff without a watch folder.

Requirements: Encode This running with **Host intake** enabled (`http://127.0.0.1:47821`), Python 3.9+. Resolve Studio is recommended for in-app scripting.

```bash
# After a file exists on disk:
python send_to_encode_this.py --path "/path/to/timeline.mov" --preset h264-match-source-high-bitrate --start

python send_to_encode_this.py --list-presets
```

Install Utility scripts (optional):

- Windows: `%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility\`
- macOS: `~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/`
- Linux: `~/.local/share/DaVinciResolve/Fusion/Scripts/Utility/`

Deliver render-queue handoff:

```bash
python resolve_deliver_handoff.py --list-jobs
python resolve_deliver_handoff.py --job-id <JobId> --preset h264-match-source-high-bitrate
```

## Limits

- Cannot inject custom codecs into Resolve’s Deliver page UI.
- OFX plugins are for effects, not encoding.
- Watch folders are the durable cross-platform path; scripts are optional.
