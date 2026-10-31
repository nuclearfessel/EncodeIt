# Host integrations (Phase 2)

## Recommended: watch folders (Windows & macOS)

### Installer choices

The installer (and first-launch setup) **detects** After Effects, DaVinci Resolve, and Premiere Pro on the machine. Apps that are not installed are skipped — no folders, watches, or extensions for them.

| Mode | Behavior |
| --- | --- |
| **Standard** | Set up every **detected** host app |
| **Custom** | Choose among **detected** apps only |

- **Windows NSIS:** detects apps, then asks Standard vs Custom.
- **macOS PKG:** Standard for detected apps only.
- **macOS DMG / portable:** same Standard vs Custom dialog on first launch (with detection).

### Folder layout

| Role | Windows | macOS |
| --- | --- | --- |
| After Effects | `%USERPROFILE%\Videos\EncodeIt\from-ae` | `~/Movies/EncodeIt/from-ae` |
| DaVinci Resolve | `...\from-resolve` | `~/Movies/EncodeIt/from-resolve` |
| Premiere Pro | `...\from-premiere` | `~/Movies/EncodeIt/from-premiere` |
| Encode output | `...\Output` | `~/Movies/EncodeIt/Output` |

Point AE / Resolve / Premiere at the matching folder — no scripts required.

**Edit → Preferences → Integrations** shows the live paths and lets you add more watches.

See:

- [after-effects/](after-effects/) — watch folder primary; ExtendScript / CEP optional
- [premiere/](premiere/) — ExtendScript handoff (or use the same watch-folder pattern)
- [davinci-resolve/](davinci-resolve/) — watch folder primary; Python optional

## Optional: localhost intake

For scripts, CEP, and CLI tools:

- **HTTP:** `http://127.0.0.1:47821` (configurable in Preferences)
  - `GET /health`
  - `GET /presets`
  - `GET /queue`
  - `POST /queue/add` `{ "paths": ["..."], "presetId": "...", "start": true }`
- **Inbox:** JSON files in the app **userData** `inbox/` folder (path shown in Preferences → Integrations)

  Typical locations:

  - Windows: `%APPDATA%\EncodeIt\inbox`
  - macOS: `~/Library/Application Support/EncodeIt/inbox`
