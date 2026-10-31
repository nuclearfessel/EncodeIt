#!/usr/bin/env python3
"""
Resolve Deliver handoff — read the render queue / deliver settings and send
existing outputs to EncodeIt.

Run inside Resolve (Utility script) or standalone:

  python resolve_deliver_handoff.py --list-jobs
  python resolve_deliver_handoff.py --job-id <id> --preset h264-match-source-high-bitrate
  python resolve_deliver_handoff.py --path "D:/renders/clip.mov"
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from typing import Any

BASE = os.environ.get("encodeit_URL", "http://127.0.0.1:47821")
PRESET = os.environ.get("encodeit_PRESET", "h264-match-source-high-bitrate")


def post_paths(paths: list[str], preset: str, start: bool = True) -> dict:
    payload = json.dumps(
        {"paths": paths, "presetId": preset, "start": start}
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE.rstrip('/')}/queue/add",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_resolve():
    """Return Resolve app object when launched from Resolve, else None."""
    try:
        import DaVinciResolveScript as dvr_script  # type: ignore

        return dvr_script.scriptapp("Resolve")
    except Exception:
        pass
    try:
        return resolve  # type: ignore[name-defined]
    except Exception:
        return None


def get_project(resolve_app):
    if not resolve_app:
        return None
    try:
        pm = resolve_app.GetProjectManager()
        return pm.GetCurrentProject() if pm else None
    except Exception:
        return None


def render_jobs(project) -> list[dict[str, Any]]:
    if not project:
        return []
    try:
        jobs = project.GetRenderJobList()
        return list(jobs) if jobs else []
    except Exception:
        return []


def job_output_path(project, job: dict[str, Any]) -> str | None:
    """Best-effort absolute path for a render job output."""
    target_dir = (job.get("TargetDir") or job.get("RenderJobTargetDir") or "").strip()
    name = (job.get("CustomName") or job.get("OutputFilename") or job.get("RenderJobName") or "").strip()
    if not target_dir or not name:
        return None

    # Resolve often omits extension in CustomName; probe common containers.
    base = os.path.join(target_dir, name)
    if os.path.isfile(base):
        return base
    for ext in (".mov", ".mp4", ".mxf", ".dpx", ".exr", ".tif", ".wav"):
        candidate = base + ext
        if os.path.isfile(candidate):
            return candidate
    return base if os.path.isfile(base) else None


def job_status(project, job_id: str) -> dict[str, Any] | None:
    try:
        status = project.GetRenderJobStatus(job_id)
        return dict(status) if status else None
    except Exception:
        return None


def format_job_line(job: dict[str, Any], path: str | None, status: dict[str, Any] | None) -> str:
    jid = job.get("JobId", "?")
    title = job.get("RenderJobName") or job.get("TimelineName") or jid
    pct = status.get("CompletionPercentage") if status else None
    state = status.get("JobStatus") if status else None
    bits = [f"{jid}\t{title}"]
    if state is not None:
        bits.append(f"status={state}")
    if pct is not None:
        bits.append(f"{pct}%")
    if path:
        bits.append(path)
    return "\t".join(bits)


def try_resolve_ui_pick(project, jobs: list[dict[str, Any]]) -> str | None:
    """Let the user pick a render job when Resolve UI is available."""
    if not jobs:
        return None
    try:
        ui = bmd.UIDispatcher(bmd.UIManager)  # type: ignore[name-defined]
        labels = []
        job_ids: list[str] = []
        for job in jobs:
            jid = str(job.get("JobId", ""))
            if not jid:
                continue
            path = job_output_path(project, job)
            status = job_status(project, jid)
            line = format_job_line(job, path, status)
            labels.append(line)
            job_ids.append(jid)

        if not labels:
            return None

        win = ui.AddWindow(
            {
                "ID": "EncodeItDeliver",
                "WindowTitle": "Send Deliver output to EncodeIt",
                "Geometry": [120, 120, 720, 220],
            },
            [
                ui.VGroup(
                    [
                        ui.Label({"Text": "Render queue job:"}),
                        ui.ComboBox({"ID": "Job", "Weight": 1}),
                        ui.Label({"ID": "PathLabel", "Text": ""}),
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
        combo = items["Job"]
        for label in labels:
            combo.AddItem(label)

        chosen: list[str] = []

        def refresh_path(_ev=None):
            idx = combo.CurrentIndex
            if idx < 0 or idx >= len(job_ids):
                items["PathLabel"].Text = ""
                return
            job = jobs[idx]
            path = job_output_path(project, job)
            items["PathLabel"].Text = path or "(output file not found yet — export or pick --path)"

        def on_send(_ev):
            idx = combo.CurrentIndex
            if idx >= 0 and idx < len(job_ids):
                chosen.append(job_ids[idx])
            win.Hide()

        def on_cancel(_ev):
            win.Hide()

        combo.CurrentIndex = 0
        refresh_path()
        combo.On.CurrentIndexChanged = refresh_path
        win.On["Send"].Clicked = on_send
        win.On["Cancel"].Clicked = on_cancel
        win.On[win.ID].Close = on_cancel
        win.Show()
        ui.RunLoop()
        return chosen[0] if chosen else None
    except Exception:
        return None


def resolve_path_from_job(project, job_id: str) -> str | None:
    for job in render_jobs(project):
        if str(job.get("JobId")) == str(job_id):
            return job_output_path(project, job)
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Resolve Deliver → EncodeIt")
    parser.add_argument("--base", default=BASE, help="Intake base URL")
    parser.add_argument("--preset", default=PRESET, help="EncodeIt preset id")
    parser.add_argument("--path", "-p", action="append", dest="paths", default=[])
    parser.add_argument("--list-jobs", action="store_true", help="Print render queue jobs")
    parser.add_argument("--job-id", help="Send output for this Resolve render JobId")
    parser.add_argument("--no-start", action="store_true", help="Queue only; do not start encoding")
    args = parser.parse_args()

    global BASE
    BASE = args.base

    resolve_app = get_resolve()
    project = get_project(resolve_app)
    jobs = render_jobs(project)

    if args.list_jobs:
        if not jobs:
            print("No render jobs in current project (or not running inside Resolve).")
            return 0 if not resolve_app else 0
        for job in jobs:
            jid = str(job.get("JobId", ""))
            path = job_output_path(project, job) if project else None
            status = job_status(project, jid) if project and jid else None
            print(format_job_line(job, path, status))
        return 0

    paths = list(args.paths)

    if args.job_id and project:
        p = resolve_path_from_job(project, args.job_id)
        if p:
            paths.append(p)

    if not paths and project and jobs:
        picked = try_resolve_ui_pick(project, jobs)
        if picked:
            p = resolve_path_from_job(project, picked)
            if p:
                paths.append(p)

    if not paths:
        # Legacy single-path prompt
        print("Enter media path to send to EncodeIt (or use --job-id / --list-jobs):")
        line = sys.stdin.readline().strip()
        if line:
            paths.append(line)

    if not paths:
        print("No path provided.", file=sys.stderr)
        return 1

    missing = [p for p in paths if not os.path.isfile(p)]
    if missing:
        print("File(s) not found:", file=sys.stderr)
        for p in missing:
            print(f"  {p}", file=sys.stderr)
        print("Deliver/render first, or pass an existing file with --path.", file=sys.stderr)
        return 1

    try:
        result = post_paths(paths, args.preset, start=not args.no_start)
        print(json.dumps(result, indent=2))
        return 0
    except Exception as exc:
        print(f"Failed to send to EncodeIt: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
