# After Effects → Encode This

Phase 2 host integration. Encode This must be running (intake enabled on `127.0.0.1:47821`).

## Option A — ExtendScript (quickest)

1. Open After Effects.
2. **File → Scripts → Run Script File…**
3. Choose `SendToEncodeThis.jsx`.

The script:

- Uses the active composition name to suggest an output stem
- Asks you to pick a rendered/exported media file (or uses a path you paste)
- Drops a JSON job into the Encode This inbox **and** POSTs to the local intake API when `curl` is available

### Install as a menu script

Copy `SendToEncodeThis.jsx` into the After Effects `Scripts` folder (or `ScriptUI Panels` if you rename/adapt for panel UI):

- Windows: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\`
- macOS: `/Applications/Adobe After Effects <version>/Scripts/`

Enable **Preferences → Scripting & Expressions → Allow Scripts to Write Files and Access Network**.

## Option B — CEP panel (dockable)

The `cep/` folder is a CEP 11 panel skeleton:

1. Symlink or copy `cep/` into the CEP extensions folder as `encode-this-ae`.
2. Enable unsigned extensions for debug (Adobe CEP debug mode).
3. Restart AE and open **Window → Encode This**.

Windows CEP extensions:

`%APPDATA%\Adobe\CEP\extensions\encode-this-ae`

macOS:

`~/Library/Application Support/Adobe/CEP/extensions/encode-this-ae`

## What this is / isn’t

| Supported | Not a full AME exporter plugin |
| --- | --- |
| Send rendered movies into Encode This queue | Replacing AE’s native render queue codecs |
| Choose Encode This presets via intake | Deep AEGP C++ IO module (future) |

For Premiere-style exporter plugins (the path Media Encoder itself uses), a later phase can add a Premiere exporter that talks to the same intake API.
