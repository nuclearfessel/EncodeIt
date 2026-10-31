#!/usr/bin/env bash
# Standalone uninstall helper for AppImage / manual installs (Linux & macOS).
# Does not remove the AppImage/binary itself unless --remove-app PATH is passed.
#
# Usage:
#   ./encodeit-uninstall.sh
#   ./encodeit-uninstall.sh --keep-media
#   ENCODEIT_KEEP_MEDIA=1 ./encodeit-uninstall.sh
#   ./encodeit-uninstall.sh --remove-app /path/to/EncodeIt.AppImage

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KEEP_MEDIA=0
REMOVE_APP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-media) KEEP_MEDIA=1; shift ;;
    --remove-app) REMOVE_APP="${2:-}"; shift 2 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "${KEEP_MEDIA}" -eq 0 ]] && [[ -z "${ENCODEIT_KEEP_MEDIA:-}" ]]; then
  if command -v zenity >/dev/null 2>&1; then
    if zenity --question --title="EncodeIt Uninstall" \
      --text="Remove EncodeIt data and plugins?\n\nChoose No to KEEP media folders (Videos/Movies/EncodeIt).\nChoose Yes to delete media too." \
      --ok-label="Remove Everything" --cancel-label="Keep Media" 2>/dev/null; then
      KEEP_MEDIA=0
    else
      KEEP_MEDIA=1
    fi
  elif command -v osascript >/dev/null 2>&1; then
    choice="$(osascript <<'APPLESCRIPT' 2>/dev/null || echo wipe
display dialog "Remove EncodeIt completely? Click Keep Media to leave watch/Output folders." buttons {"Keep Media", "Remove Everything"} default button "Remove Everything" with title "EncodeIt Uninstall"
if button returned of result is "Keep Media" then
  return "keep"
else
  return "wipe"
end if
APPLESCRIPT
)"
    [[ "${choice}" == "keep" ]] && KEEP_MEDIA=1
  fi
fi

ARGS=()
[[ "${KEEP_MEDIA}" -eq 1 ]] && ARGS+=(--keep-media)

bash "${SCRIPT_DIR}/clean-encodeit-paths.sh" "${ARGS[@]+"${ARGS[@]}"}"

if [[ -n "${REMOVE_APP}" && -e "${REMOVE_APP}" ]]; then
  rm -rf "${REMOVE_APP}"
  echo "Removed app ${REMOVE_APP}"
fi

echo "EncodeIt cleanup finished."
