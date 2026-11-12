# Windows icon setup

`Windows/` contains package/MSIX image scales, Windows tile sizes, transparent
AppList images for default/dark/light themes, and a multi-resolution `.ico` for
classic desktop windows and shortcuts.

1. Copy `Windows/package/images/` into the package's manifest image directory
   and match the declared paths to the supplied filenames.
2. Follow `Windows/PACKAGE-MANIFEST-SNIPPET.md` for the VisualElements image
   path examples. Keep its paths in sync with your package manifest.
3. Add `Windows/app-list/` assets to the app's app-list resources using their
   exact filenames. Use the relevant theme-specific image variants.
4. Use the `.ico` for Win32 window and shortcut resources where appropriate.
5. Build and validate the package in your Windows toolchain. Store submission
   and Partner Center ingestion were not performed.

The assets are square and have no pre-rounded corners or baked outer shadow.
AppList assets are intentionally transparent; do not substitute them for
store-listing screenshots.

Reference: https://learn.microsoft.com/en-us/windows/apps/design/iconography/app-icon-construction
