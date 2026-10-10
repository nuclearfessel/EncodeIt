#!/usr/bin/env python3
"""Send media paths to a running Encode This intake server."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request

DEFAULT_BASE = "http://127.0.0.1:47821"


def request(method: str, url: str, payload: dict | None = None) -> dict:
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8")
        return json.loads(body) if body else {}


def main() -> int:
    parser = argparse.ArgumentParser(description="Send files to Encode This")
    parser.add_argument("--base", default=DEFAULT_BASE, help="Intake base URL")
    parser.add_argument("--path", action="append", dest="paths", default=[], help="Media path (repeatable)")
    parser.add_argument("--preset", default="h264-match-source-high-bitrate", help="Preset id")
    parser.add_argument("--start", action="store_true", help="Start the encode queue")
    parser.add_argument("--list-presets", action="store_true")
    parser.add_argument("--health", action="store_true")
    args = parser.parse_args()

    try:
        if args.health or args.list_presets or args.paths:
            health = request("GET", f"{args.base.rstrip('/')}/health")
            if args.health:
                print(json.dumps(health, indent=2))
                if not args.list_presets and not args.paths:
                    return 0

        if args.list_presets:
            presets = request("GET", f"{args.base.rstrip('/')}/presets")
            for p in presets:
                print(f"{p['id']}\t{p['group']}/{p.get('subgroup') or '-'}\t{p['name']}")
            if not args.paths:
                return 0

        if not args.paths:
            parser.error("Provide --path and/or --list-presets / --health")

        result = request(
            "POST",
            f"{args.base.rstrip('/')}/queue/add",
            {
                "paths": args.paths,
                "presetId": args.preset,
                "start": bool(args.start),
            },
        )
        print(json.dumps(result, indent=2))
        return 0
    except urllib.error.URLError as exc:
        print(
            f"Could not reach Encode This at {args.base}\n{exc}\n"
            "Start the app and enable Host intake.",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
