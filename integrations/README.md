# Host integrations (Phase 2)

Encode This exposes a **localhost intake** so other apps can add jobs without embedding FFmpeg themselves.

- **HTTP:** `http://127.0.0.1:47821` (configurable in Settings)
  - `GET /health`
  - `GET /presets`
  - `GET /queue`
  - `POST /queue/add` `{ "paths": ["..."], "presetId": "...", "start": true }`
- **Inbox:** JSON files in the app userData `inbox/` folder (polled automatically)

See:

- [after-effects/](after-effects/) — ExtendScript, CEP panel (`npm run package:cep` for release zip)
- [premiere/](premiere/) — ExtendScript handoff (native exporter later)
- [davinci-resolve/](davinci-resolve/) — CLI + Deliver queue handoff
