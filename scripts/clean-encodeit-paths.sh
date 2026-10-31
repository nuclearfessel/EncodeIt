#!/usr/bin/env bash
# Shared EncodeIt / Encode This cleanup for macOS pkg & Linux.
# Usage: clean-encodeit-paths.sh [--keep-media]
# Env: ENCODEIT_KEEP_MEDIA=1 also keeps Videos/Movies media folders.

set -euo pipefail

KEEP_MEDIA=0
if [[ "${1:-}" == "--keep-media" ]] || [[ "${ENCODEIT_KEEP_MEDIA:-}" == "1" ]]; then
  KEEP_MEDIA=1
fi

HOME_DIR="${HOME}"
OS="$(uname -s)"

rm_rf() {
  local p="$1"
  if [[ -e "${p}" || -L "${p}" ]]; then
    rm -rf "${p}"
    echo "Removed ${p}"
  fi
}

# App data
if [[ "${OS}" == "Darwin" ]]; then
  for name in "EncodeIt" "Encode This"; do
    rm_rf "${HOME_DIR}/Library/Application Support/${name}"
    rm_rf "${HOME_DIR}/Library/Logs/${name}"
    rm_rf "${HOME_DIR}/Library/Caches/${name}"
  done
  rm_rf "${HOME_DIR}/Library/Preferences/com.encodeit.app.plist"
  rm_rf "${HOME_DIR}/Library/Preferences/com.encode-this.app.plist"
  MEDIA_ROOT="${HOME_DIR}/Movies"
  CEP_ROOT="${HOME_DIR}/Library/Application Support/Adobe/CEP/extensions"
  RESOLVE_UTIL="${HOME_DIR}/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility"
  ADOBE_ROOTS=("/Applications" "${HOME_DIR}/Applications")
else
  for name in "EncodeIt" "encodeit" "Encode This" "encode-this"; do
    rm_rf "${HOME_DIR}/.config/${name}"
    rm_rf "${HOME_DIR}/.cache/${name}"
  done
  MEDIA_ROOT="${HOME_DIR}/Videos"
  CEP_ROOT=""
  RESOLVE_UTIL="${HOME_DIR}/.local/share/DaVinciResolve/Fusion/Scripts/Utility"
  ADOBE_ROOTS=()
fi

# Media (optional)
if [[ "${KEEP_MEDIA}" -eq 0 ]]; then
  for name in "EncodeIt" "Encode This"; do
    rm_rf "${MEDIA_ROOT}/${name}"
  done
fi

# CEP
if [[ -n "${CEP_ROOT}" ]]; then
  for id in encodeit-ae encode-this-ae; do
    rm_rf "${CEP_ROOT}/${id}"
  done
fi

# Resolve Utility scripts
if [[ -d "${RESOLVE_UTIL}" ]]; then
  for f in send_to_encodeit.py send_to_encode_this.py resolve_deliver_handoff.py resolve_deliver_handoff_encode_this.py; do
    rm_rf "${RESOLVE_UTIL}/${f}"
  done
fi

# Adobe JSX scripts
for root in "${ADOBE_ROOTS[@]:-}"; do
  [[ -d "${root}" ]] || continue
  find "${root}" \( -iname 'Adobe After Effects*' -o -iname 'Adobe Premiere Pro*' \) -type d 2>/dev/null | while read -r appdir; do
    find "${appdir}" \( -name 'SendToEncodeIt.jsx' -o -name 'SendToEncodeThis.jsx' \) -type f 2>/dev/null | while read -r jsx; do
      rm_rf "${jsx}"
    done
  done
done

exit 0
