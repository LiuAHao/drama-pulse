#!/usr/bin/env python3
"""
Run the full highlight pipeline for one episode:

normalize_transcript -> generate_story_context -> detect_highlights -> review_highlights -> import_candidates
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent


def run_step(command: list[str]) -> None:
    print(">", " ".join(command))
    result = subprocess.run(command, cwd=SCRIPT_DIR.parent.parent)
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the Drama Pulse highlight pipeline for one episode.")
    parser.add_argument("--raw-asr", required=True, help="Raw ASR JSON path")
    parser.add_argument("--drama-id", required=True)
    parser.add_argument("--episode-id", required=True)
    parser.add_argument("--output-dir", required=True, help="Episode artifact output directory")
    parser.add_argument("--import-db", action="store_true", help="Import final candidates into app db")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    episode_no = args.episode_id.split("_")[-1]
    transcript_path = output_dir / f"episode-{int(episode_no):d}-transcript.json"
    story_context_path = output_dir / f"episode-{int(episode_no):d}-story-context.json"
    seedance_path = output_dir / f"episode-{int(episode_no):d}-seedance-candidates.json"
    reviewed_path = output_dir / f"episode-{int(episode_no):d}-reviewed-raw.json"
    final_path = output_dir / f"episode-{int(episode_no):d}-final-candidates.json"

    run_step([
        sys.executable,
        str(SCRIPT_DIR / "normalize_transcript.py"),
        args.raw_asr,
        "--drama-id", args.drama_id,
        "--episode-id", args.episode_id,
        "-o", str(transcript_path),
    ])
    run_step([
        sys.executable,
        str(SCRIPT_DIR / "generate_story_context.py"),
        str(transcript_path),
        "-o", str(story_context_path),
    ])
    run_step([
        sys.executable,
        str(SCRIPT_DIR / "detect_highlights.py"),
        str(transcript_path),
        "--story-context", str(story_context_path),
        "-o", str(seedance_path),
    ])
    run_step([
        sys.executable,
        str(SCRIPT_DIR / "review_highlights.py"),
        str(seedance_path),
        "-t", str(transcript_path),
        "--story-context", str(story_context_path),
        "--save-reviewed", str(reviewed_path),
        "-o", str(final_path),
    ])

    if args.import_db:
        run_step([
            sys.executable,
            str(SCRIPT_DIR / "import_candidates.py"),
            str(final_path),
            "--episode-id", args.episode_id,
            "--replace-ai-candidates",
        ])

    print(f"Pipeline complete for {args.episode_id}")
    print(f"  transcript: {transcript_path}")
    print(f"  story context: {story_context_path}")
    print(f"  seedance: {seedance_path}")
    print(f"  reviewed: {reviewed_path}")
    print(f"  final: {final_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
