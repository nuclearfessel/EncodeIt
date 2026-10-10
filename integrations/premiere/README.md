# Premiere Pro → Encode This

Phase 2 uses the same **localhost intake** and **inbox** as After Effects and Resolve. A native Premiere **Exporter** plugin (the path Adobe Media Encoder uses) is not included yet; this folder is the supported handoff until that lands.

## ExtendScript (supported today)

1. Open Premiere Pro.
2. **File → Scripts → Run Script File…**
3. Choose `SendToEncodeThis.jsx`.

The script posts to `POST /queue/add` when `curl` is available and drops a JSON job into the Encode This inbox as a fallback.

### Install as a menu script

Copy `SendToEncodeThis.jsx` into the Premiere `Scripts` folder:

- Windows: `C:\Program Files\Adobe\Adobe Premiere Pro <version>\Scripts\`
- macOS: `/Applications/Adobe Premiere Pro <version>/Scripts/`

Enable **Preferences → Scripting & Expressions → Allow Scripts to Write Files and Access Network**.

## Workflow

1. Export from Premiere (same as you would for Media Encoder handoff).
2. Run the script and pick the exported file.
3. Optionally paste a preset id from Encode This (**Edit → Preferences → Integrations** or `GET /presets`).

## Future: native exporter

A Premiere exporter module would register in **File → Export → Media** and stream jobs to the same intake API without a file picker. Track progress in the main repo README Phase 2 section.
