# Apple icon setup

## Included targets

Shopped includes **iOS/iPadOS and macOS** app icon catalogs. EncodeIt includes a
**macOS-only** catalog. EncodeIt has no iOS/iPadOS app icon set.

## Xcode

1. In the matching app target's existing `Assets.xcassets`, replace only its
   `AppIcon.appiconset` with the supplied folder. Keep unrelated assets.
2. In the target's General → App Icons and Launch Screen settings, select
   `AppIcon`; its build setting should be `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon`.
3. Use `Apple/iOS/Assets.xcassets/AppIcon.appiconset/` for Shopped iOS and
   `Apple/macOS/Assets.xcassets/AppIcon.appiconset/` for the Mac target.
4. Archive and inspect the icon on a simulator/device and in App Store Connect
   before submission.

The supplied App Store PNGs are full-square and unmasked. Do not use the
rounded-corner preview as a store-upload image. `.icns` files are included for
Mac projects that need a native ICNS resource; use the catalog for Xcode's
App Store icon slots. Foreground-only source art is under `Artwork/`.

Xcode and App Store Connect validation require Apple tools and were not run
here; no project source or store listing was changed.

References:
- https://developer.apple.com/design/human-interface-guidelines/app-icons
- https://developer.apple.com/documentation/xcode/configuring-your-app-icon
