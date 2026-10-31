#!/bin/bash
# Debian/Ubuntu after-remove — wipe EncodeIt user data (per uninstalling user when possible).
# Keep media: ENCODEIT_KEEP_MEDIA=1 or answer Keep in zenity when available.
set -euo pipefail

# Only run on remove/purge, not failed-upgrade.
ACTION="${1:-}"
if [[ "${ACTION}" != "remove" && "${ACTION}" != "purge" && -n "${ACTION}" ]]; then
  # electron-builder may invoke without dpkg args; still clean.
  :
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLEANER="${SCRIPT_DIR}/clean-encodeit-paths.sh"
[[ -f "${CLEANER}" ]] || CLEANER="/usr/lib/encodeit/clean-encodeit-paths.sh"

TARGET_USER="${SUDO_USER:-${USER:-}}"
TARGET_HOME="${HOME}"
if [[ -n "${TARGET_USER}" && "${TARGET_USER}" != "root" ]]; then
  TARGET_HOME="$(getent passwd "${TARGET_USER}" 2>/dev/null | cut -d: -f6 || echo "${HOME}")"
fi

KEEP_MEDIA="${ENCODEIT_KEEP_MEDIA:-0}"
if [[ "${KEEP_MEDIA}" != "1" ]] && [[ -n "${DISPLAY:-}" ]] && command -v zenity >/dev/null 2>&1; then
  if sudo -u "${TARGET_USER}" DISPLAY="${DISPLAY}" zenity --question \
    --title="EncodeIt Uninstall" \
    --text="Remove EncodeIt media folders (Videos/EncodeIt) as well?" \
    --ok-label="Remove Everything" --cancel-label="Keep Media" 2>/dev/null; then
    KEEP_MEDIA=0
  else
    KEEP_MEDIA=1
  fi
fi

ARGS=()
[[ "${KEEP_MEDIA}" == "1" ]] && ARGS+=(--keep-media)

if [[ -f "${CLEANER}" ]]; then
  sudo -u "${TARGET_USER}" HOME="${TARGET_HOME}" bash "${CLEANER}" "${ARGS[@]+"${ARGS[@]}"}" || \
    HOME="${TARGET_HOME}" bash "${CLEANER}" "${ARGS[@]+"${ARGS[@]}"}"
else
  HOME="${TARGET_HOME}"
  for name in EncodeIt encodeit "Encode This" encode-this; do
    rm -rf "${HOME}/.config/${name}" "${HOME}/.cache/${name}"
  done
  if [[ "${KEEP_MEDIA}" != "1" ]]; then
    rm -rf "${HOME}/Videos/EncodeIt" "${HOME}/Videos/Encode This"
  fi
fi

exit 0
