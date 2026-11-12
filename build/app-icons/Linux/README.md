# Linux icon setup

This folder is included for **EncodeIt only**.

- `Linux/hicolor/scalable/apps/encodeit.svg` is the scalable icon.
- `Linux/hicolor/<size>x<size>/apps/encodeit.png` supplies transparent PNGs
  at 16, 22, 24, 32, 48, 64, 128, 256, and 512 pixels.
- `Linux/.DirIcon` is a 256-pixel PNG for directory/icon-browser use.
- `Linux/encodeit.desktop.example` is a freedesktop desktop-entry example.

Install the scalable and raster files into the corresponding system or
application hicolor icon-theme directories. Set `Icon=encodeit` in the
desktop entry; replace the example `Exec=encodeit` with the actual installed
command if it differs. Do not package Android or iOS assets for EncodeIt.

Reference: https://specifications.freedesktop.org/icon-theme/latest/
