# Premiere Pro → Encode This

## Watch folder (recommended, Windows & macOS)

Install / first launch creates and watches:

- Windows: `%USERPROFILE%\Videos\Encode This\from-premiere`
- macOS: `~/Movies/Encode This/from-premiere`

1. Install Encode This (or run once).
2. Export from Premiere into that folder (path under **Preferences → Integrations**).
3. New files are queued automatically (no script).

## Optional — ExtendScript

1. Open Premiere Pro.
2. **File → Scripts → Run Script File…**
3. Choose `SendToEncodeThis.jsx`.

The script posts to `POST /queue/add` when `curl` is available and drops a JSON job into the Encode This inbox as a fallback.

### Install as a menu script

Copy `SendToEncodeThis.jsx` into the Premiere `Scripts` folder:

- Windows: `C:\Program Files\Adobe\Adobe Premiere Pro <version>\Scripts\`
- macOS: `/Applications/Adobe Premiere Pro <version>/Scripts/`

Enable **Preferences → Scripting & Expressions → Allow Scripts to Write Files and Access Network**.

Inbox paths (Electron `userData`):

- Windows: `%APPDATA%\Encode This\inbox`
- macOS: `~/Library/Application Support/Encode This/inbox`

## Future: native exporter

A Premiere exporter module would register in **File → Export → Media** and stream jobs to the same intake API without a file picker.
