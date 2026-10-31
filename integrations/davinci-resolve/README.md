# DaVinci Resolve → EncodeIt

Resolve does not expose a public “replace Deliver codecs” plugin API. The supported workaround on **Windows and macOS** is to Deliver into a folder EncodeIt watches.

## Watch folder (primary)

Install / first launch creates and watches:

- Windows: `%USERPROFILE%\Videos\EncodeIt\from-resolve`
- macOS: `~/Movies/EncodeIt/from-resolve`

1. Install EncodeIt (or run once) so the folder exists.
2. In Resolve **Deliver**, set the destination to that folder (also listed under **Preferences → Integrations**).
3. Keep EncodeIt running and Deliver as usual (prefer a high-quality intermediate / master).

Existing files already in the folder when a watch is added or enabled are ignored — only **new** arrivals are queued.

## Optional — Python CLI / Utility scripts

Use only if you need a one-off send or Deliver-queue handoff without a watch folder.

Requirements: EncodeIt running with **Host intake** enabled (`http://127.0.0.1:47821`), Python 3.9+. Resolve Studio is recommended for in-app scripting.

```bash
# After a file exists on disk:
python send_to_encodeit.py --path "/path/to/timeline.mov" --preset h264-match-source-high-bitrate --start

python send_to_encodeit.py --list-presets
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
