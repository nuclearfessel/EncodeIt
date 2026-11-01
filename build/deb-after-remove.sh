#!/bin/bash
# Debian/Ubuntu after-remove — wipe EncodeIt user data (per uninstalling user when possible).
# Keep media: ENCODEIT_KEEP_MEDIA=1 or answer Keep in zenity when available.
#
# IMPORTANT: electron-builder substitutes ${Name} macros (letters only) in this file.
# Prefer $VAR / ${VAR_WITH_UNDERSCORE} — never ${ACTION}, ${HOME}, ${USER}, etc.
set -euo pipefail

# Only run on remove/purge, not failed-upgrade.
DPKG_ACTION="$1"
if [ -n "$DPKG_ACTION" ] && [ "$DPKG_ACTION" != "remove" ] && [ "$DPKG_ACTION" != "purge" ]; then
  # electron-builder may invoke without dpkg args; still clean.
  :
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLEANER="$SCRIPT_DIR/clean-encodeit-paths.sh"
if [ ! -f "$CLEANER" ]; then
  CLEANER="/usr/lib/encodeit/clean-encodeit-paths.sh"
fi

TARGET_USER="${SUDO_USER:-}"
if [ -z "$TARGET_USER" ]; then
  TARGET_USER="${USER:-}"
fi
TARGET_HOME="$HOME"
if [ -n "$TARGET_USER" ] && [ "$TARGET_USER" != "root" ]; then
  TARGET_HOME="$(getent passwd "$TARGET_USER" 2>/dev/null | cut -d: -f6 || echo "$HOME")"
fi

KEEP_MEDIA="${ENCODEIT_KEEP_MEDIA:-0}"
if [ "$KEEP_MEDIA" != "1" ] && [ -n "${DISPLAY:-}" ] && command -v zenity >/dev/null 2>&1; then
  if sudo -u "$TARGET_USER" DISPLAY="$DISPLAY" zenity --question \
    --title="EncodeIt Uninstall" \
    --text="Remove EncodeIt media folders (Videos/EncodeIt) as well?" \
    --ok-label="Remove Everything" --cancel-label="Keep Media" 2>/dev/null; then
    KEEP_MEDIA=0
  else
    KEEP_MEDIA=1
  fi
fi

ARGS=()
if [ "$KEEP_MEDIA" = "1" ]; then
  ARGS+=(--keep-media)
fi

if [ -f "$CLEANER" ]; then
  sudo -u "$TARGET_USER" HOME="$TARGET_HOME" bash "$CLEANER" "${ARGS[@]+"${ARGS[@]}"}" || \
    HOME="$TARGET_HOME" bash "$CLEANER" "${ARGS[@]+"${ARGS[@]}"}"
else
  HOME="$TARGET_HOME"
  for name in EncodeIt encodeit "Encode This" encode-this; do
    rm -rf "$HOME/.config/$name" "$HOME/.cache/$name"
  done
  if [ "$KEEP_MEDIA" != "1" ]; then
    rm -rf "$HOME/Videos/EncodeIt" "$HOME/Videos/Encode This"
  fi
fi

exit 0
