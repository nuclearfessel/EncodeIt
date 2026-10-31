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

All desktop packages include a bundled FFmpeg.

### Updates
EncodeIt **checks** GitHub for a newer release and shows a status bar when one is available. It does **not** download or install updates automatically — click **Download…** to open the release in your browser.

### Uninstall
Use the OS uninstaller (Windows Setup / macOS PKG / Linux deb), **Help → Uninstall EncodeIt…** in the app, or the scripts in the repo (`scripts/Uninstall-EncodeIt.cmd`, `scripts/encodeit-uninstall.sh`).

By default uninstall removes settings, plugins/scripts, **and** media folders (`Videos`/`Movies` → EncodeIt). Choose **Keep media** to leave watch folders and Output alone.
