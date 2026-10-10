# Host integrations (Phase 2)

## Recommended: watch folders (Windows & macOS)

Point After Effects / Premiere / Resolve at a shared folder. Encode This watches it and queues new media automatically.

**Edit → Preferences → Integrations → Watch folders**

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

  - Windows: `%APPDATA%\Encode This\inbox`
  - macOS: `~/Library/Application Support/Encode This/inbox`
