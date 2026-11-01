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
EncodeIt **checks** GitHub for a newer release. The bottom status bar is always visible; when an update is available it offers **Download…**. It does **not** download or install updates automatically — click **Download…** to open the release in your browser.

**Installing over an existing copy**

| Package | Behavior |
|---|---|
| **Windows Setup (.exe)** | Detects the existing install (same app id). Removes the old Program Files copy, then installs the new version. Settings, queue, presets, and media are kept unless you check **Clean install** on the host-integrations page (then you can choose whether to wipe media too). |
| **Windows portable** | Replace the `.exe` with the newer file (no registry install). |
| **macOS PKG** | Upgrades the installed app in place. If prior data exists, offers **Keep Settings** (default) or **Clean Install**. |
| **macOS DMG / zip** | Drag/replace `EncodeIt.app` in Applications. |
| **Linux .deb** | `dpkg`/`apt` upgrades in place (data kept by default). GUI installs can offer Clean Install via zenity; or set `ENCODEIT_CLEAN_INSTALL=1`. |
| **AppImage** | Replace the AppImage file with the newer one. |

**Clean install** is built into Windows Setup, macOS PKG, and Linux `.deb`. For portable / DMG / AppImage, uninstall first (see below), then replace the app.

### Uninstall
Use the OS uninstaller (Windows Setup / macOS PKG / Linux deb), **Help → Uninstall EncodeIt…** in the app, or the scripts in the repo (`scripts/Uninstall-EncodeIt.cmd`, `scripts/encodeit-uninstall.sh`).

By default uninstall removes settings, plugins/scripts, **and** media folders (`Videos`/`Movies` → EncodeIt). Choose **Keep media** to leave watch folders and Output alone. That full wipe runs on a real uninstall — not when an installer is only upgrading (use each installer’s **Clean install** option to wipe during an upgrade).
