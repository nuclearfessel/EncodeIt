#!/bin/bash
# Debian/Ubuntu after-install — optional Clean install when prior data exists.
# Default: keep settings (upgrade in place).
# Force wipe: ENCODEIT_CLEAN_INSTALL=1
# Keep media when wiping: ENCODEIT_KEEP_MEDIA=1
# With a GUI session, zenity offers Keep Settings vs Clean Install.
#
# IMPORTANT: electron-builder substitutes dollar-brace letter-only tokens in this file.
# Prefer bare $VAR forms only.
set -euo pipefail

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

has_prior=0
for app_name in EncodeIt encodeit "Encode This" encode-this; do
  if [ -d "$TARGET_HOME/.config/$app_name" ]; then
    has_prior=1
    break
  fi
done

if [ "$has_prior" != "1" ]; then
  exit 0
fi

DO_CLEAN="${ENCODEIT_CLEAN_INSTALL:-0}"
if [ "$DO_CLEAN" != "1" ] && [ -n "${DISPLAY:-}" ] && command -v zenity >/dev/null 2>&1; then
  if sudo -u "$TARGET_USER" DISPLAY="$DISPLAY" zenity --question \
    --title="EncodeIt Install" \
    --text="EncodeIt data was found on this system.\n\nKeep Settings upgrades in place.\nClean Install wipes previous settings and plugins (you can keep media)." \
    --ok-label="Clean Install" --cancel-label="Keep Settings" 2>/dev/null; then
    DO_CLEAN=1
  else
    DO_CLEAN=0
  fi
fi

if [ "$DO_CLEAN" != "1" ]; then
  exit 0
fi

KEEP_MEDIA="${ENCODEIT_KEEP_MEDIA:-0}"
if [ -z "${ENCODEIT_KEEP_MEDIA:-}" ] && [ -n "${DISPLAY:-}" ] && command -v zenity >/dev/null 2>&1; then
  if sudo -u "$TARGET_USER" DISPLAY="$DISPLAY" zenity --question \
    --title="EncodeIt Clean Install" \
    --text="Also delete EncodeIt media folders under Videos?" \
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
  for app_name in EncodeIt encodeit "Encode This" encode-this; do
    rm -rf "$HOME/.config/$app_name" "$HOME/.cache/$app_name"
  done
  if [ "$KEEP_MEDIA" != "1" ]; then
    rm -rf "$HOME/Videos/EncodeIt" "$HOME/Videos/Encode This"
  fi
fi

exit 0
