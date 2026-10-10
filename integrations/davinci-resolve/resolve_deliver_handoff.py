#!/usr/bin/env python3
"""
Optional Resolve Utility script.

When launched from Resolve (Studio scripting), prompts for a rendered file path
and hands it to Encode This. Safe to run standalone with --path as well.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request

BASE = os.environ.get("ENCODE_THIS_URL", "http://127.0.0.1:47821")
PRESET = os.environ.get("ENCODE_THIS_PRESET", "h264-match-source-high-bitrate")


def post_paths(paths: list[str]) -> dict:
    payload = json.dumps({"paths": paths, "presetId": PRESET, "start": True}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE.rstrip('/')}/queue/add",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def try_resolve_ui_prompt() -> str | None:
    """Best-effort: if bmd UI is available inside Resolve, ask for a file."""
    try:
        # Resolve injects `bmd` / `resolve` into Utility scripts in many installs.
        ui = bmd.UIDispatcher(bmd.UIManager)  # type: ignore[name-defined]
        win = ui.AddWindow(
            {
                "ID": "EncodeThisHandoff",
                "WindowTitle": "Send to Encode This",
                "Geometry": [100, 100, 520, 140],
            },
            [
                ui.VGroup(
                    [
                        ui.Label({"Text": "Path to rendered media:"}),
                        ui.LineEdit({"ID": "Path", "Text": ""}),
                        ui.HGroup(
                            [
                                ui.Button({"ID": "Send", "Text": "Send + Start"}),
                                ui.Button({"ID": "Cancel", "Text": "Cancel"}),
                            ]
                        ),
                    ]
                )
            ],
        )

        items = win.GetItems()

        def on_send(_ev):
            win.Hide()

        def on_cancel(_ev):
            items["Path"].Text = ""
            win.Hide()

        win.On["Send"].Clicked = on_send
        win.On["Cancel"].Clicked = on_cancel
        win.On[win.ID].Close = on_cancel
        win.Show()
        ui.RunLoop()
        path = items["Path"].Text.strip()
        return path or None
    except Exception:
        return None


def main() -> int:
    path = None
    if len(sys.argv) > 1 and sys.argv[1] in ("--path", "-p") and len(sys.argv) > 2:
        path = sys.argv[2]
    else:
        path = try_resolve_ui_prompt()

    if not path:
        # Fallback stdin for headless testing
        print("Enter media path to send to Encode This:")
        path = sys.stdin.readline().strip()
    if not path:
        print("No path provided.", file=sys.stderr)
        return 1

    try:
        result = post_paths([path])
        print(json.dumps(result, indent=2))
        return 0
    except Exception as exc:
        print(f"Failed to send to Encode This: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
