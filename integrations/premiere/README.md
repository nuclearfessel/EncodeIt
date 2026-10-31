# Premiere Pro → EncodeIt

## Watch folder (recommended, Windows & macOS)

Install / first launch creates and watches:

- Windows: `%USERPROFILE%\Videos\EncodeIt\from-premiere`
- macOS: `~/Movies/EncodeIt/from-premiere`

1. Install EncodeIt (or run once).
2. Export from Premiere into that folder (path under **Preferences → Integrations**).
3. New files are queued automatically (no script).

## Optional — ExtendScript

1. Open Premiere Pro.
2. **File → Scripts → Run Script File…**
3. Choose `SendToEncodeIt.jsx`.

The script posts to `POST /queue/add` when `curl` is available and drops a JSON job into the EncodeIt inbox as a fallback.

### Install as a menu script

Copy `SendToEncodeIt.jsx` into the Premiere `Scripts` folder:

- Windows: `C:\Program Files\Adobe\Adobe Premiere Pro <version>\Scripts\`
- macOS: `/Applications/Adobe Premiere Pro <version>/Scripts/`

Enable **Preferences → Scripting & Expressions → Allow Scripts to Write Files and Access Network**.

Inbox paths (Electron `userData`):

- Windows: `%APPDATA%\EncodeIt\inbox`
- macOS: `~/Library/Application Support/EncodeIt/inbox`

## Future: native exporter

A Premiere exporter module would register in **File → Export → Media** and stream jobs to the same intake API without a file picker.
