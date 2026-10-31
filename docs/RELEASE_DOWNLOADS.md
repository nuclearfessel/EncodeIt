## Which file should I download?

Same EncodeIt build, different packaging. Pick **one** for your OS.

### Windows
| File pattern | What it is |
|---|---|
| **EncodeIt.Setup.\*.exe** | Installer — choose folder, Start Menu shortcuts |
| **EncodeIt.\*.exe** (no “Setup”) | Portable — run without installing |

### macOS (Apple Silicon)
| File pattern | What it is |
|---|---|
| **\*-arm64.dmg** | Disk image — open and drag EncodeIt to Applications |
| **\*-arm64.pkg** | Installer package — guided / managed install |
| **\*-arm64-mac.zip** | Zipped `.app` — unzip and run |

### Linux (x64)
| File pattern | What it is |
|---|---|
| **\*.AppImage** | Self-contained — `chmod +x` and run |
| **\*_amd64.deb** | Debian/Ubuntu package — install with `dpkg` / `apt` |

### Optional
| File | What it is |
|---|---|
| **encodeit-ae-cep.zip** | After Effects CEP panel (host integration), not the desktop app |

All desktop packages include a bundled FFmpeg. EncodeIt does not auto-update from these files — download a newer release when you want to upgrade.
