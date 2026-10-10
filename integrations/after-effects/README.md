# After Effects → Encode This

**Recommended (Windows & macOS):** render into a folder Encode This is watching. No scripts required.

Encode This must be running. Host intake is optional for this workflow.

## Watch folder (primary)

Install / first launch creates and watches:

- Windows: `%USERPROFILE%\Videos\Encode This\from-ae`
- macOS: `~/Movies/Encode This/from-ae`

1. Install Encode This (or run once) so the folder exists.
2. In After Effects, set **Output Module** / render destination to that folder (path also listed under **Preferences → Integrations**).
3. Keep Encode This running and render as usual. New files are queued automatically.

Existing files already in the folder when a watch is added or enabled are ignored — only **new** arrivals are queued.

## Optional — ExtendScript

Use only if you need a one-off send without a watch folder.

1. Enable **Preferences → Scripting & Expressions → Allow Scripts to Write Files and Access Network**.
2. **File → Scripts → Run Script File…** → `SendToEncodeThis.jsx`
3. Pick a rendered media file.

Install into AE’s Scripts folder if you want it on the menu:

- Windows: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\`
- macOS: `/Applications/Adobe After Effects <version>/Scripts/`

The script POSTs to the local intake API when possible and also drops JSON into Encode This’s inbox (path shown under Preferences → Integrations).

## Optional — CEP panel

Dockable panel under `cep/` (loads presets from `GET /presets`). See [cep/PACKAGING.md](cep/PACKAGING.md).

1. Copy/symlink `cep/` to:
   - Windows: `%APPDATA%\Adobe\CEP\extensions\encode-this-ae`
   - macOS: `~/Library/Application Support/Adobe/CEP/extensions/encode-this-ae`
2. Enable CEP debug mode for unsigned extensions.
3. Restart AE → **Window → Encode This**.

## What this is / isn’t

| Supported | Not supported |
| --- | --- |
| Watch folder from AE Output Module | Replacing AE’s native render codecs |
| Optional script / CEP → intake API | Full AME-style exporter plugin |
