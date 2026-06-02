#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from common import build_output_paths, update_manifest_stage


SCRIPT_DIR = Path(__file__).resolve().parent


def run_step(command: list[str]) -> None:
    print(">", " ".join(command))
    result = subprocess.run(command, cwd=SCRIPT_DIR.parents[1])
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def parse_episode_inputs(raw_items: list[str]) -> dict[str, str]:
    episode_inputs: dict[str, str] = {}
    for raw_item in raw_items:
        if "=" not in raw_item:
            raise ValueError(f"Invalid --episode-input value: {raw_item}")
        episode_id, source_path = raw_item.split("=", 1)
        episode_inputs[episode_id.strip()] = source_path.strip()
    return episode_inputs


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the story context package pipeline for one drama.")
    parser.add_argument("--drama-id", required=True, help="Drama id")
    parser.add_argument(
        "--episode-input",
        action="append",
        default=[],
        help="Episode input mapping in the form episode_xxx=/path/to/json",
    )
    parser.add_argument("--tail-episode-id", required=True, help="Tail episode id")
    parser.add_argument(
        "--output-root",
        default="",
        help="Output root directory, defaults to artifacts/story_context",
    )
    parser.add_argument("--drama-title", default="", help="Optional drama title override for transcript stage")
    parser.add_argument("--main-genre", default="", help="Optional main genre override for transcript stage")
    parser.add_argument("--use-llm", action="store_true", help="Use LLM for summary/overview/snapshot stages")
    parser.add_argument("--model", default="", help="Override model name for all LLM stages")
    args = parser.parse_args()

    if not args.episode_input:
        raise SystemExit("At least one --episode-input is required")

    episode_inputs = parse_episode_inputs(args.episode_input)
    output_root = Path(args.output_root).resolve() if args.output_root else SCRIPT_DIR.parents[1] / "artifacts" / "story_context"
    paths = build_output_paths(output_root, args.drama_id)
    for key, path in paths.items():
        if key not in {"manifest", "base"}:
            path.mkdir(parents=True, exist_ok=True)

    transcript_paths: list[str] = []
    summary_paths: list[str] = []

    for episode_id, source_path in sorted(episode_inputs.items()):
        transcript_output = paths["transcripts"] / f"{episode_id}.json"
        run_step([
            sys.executable,
            str(SCRIPT_DIR / "01_extract_transcript.py"),
            source_path,
            "--drama-id",
            args.drama_id,
            "--episode-id",
            episode_id,
            "--drama-title",
            args.drama_title,
            "--main-genre",
            args.main_genre,
            "-o",
            str(transcript_output),
        ])
        transcript_paths.append(str(transcript_output))
        update_manifest_stage(
            paths["manifest"],
            args.drama_id,
            "transcript",
            status="completed",
            episode_updates={episode_id: {"transcriptPath": str(transcript_output)}},
        )

        summary_output = paths["episode_summaries"] / f"{episode_id}.json"
        summary_command = [
            sys.executable,
            str(SCRIPT_DIR / "02_generate_episode_summary.py"),
            str(transcript_output),
            "-o",
            str(summary_output),
        ]
        if args.use_llm:
            summary_command.append("--use-llm")
        if args.model:
            summary_command.extend(["--model", args.model])
        run_step(summary_command)
        summary_paths.append(str(summary_output))
        update_manifest_stage(
            paths["manifest"],
            args.drama_id,
            "episode_summary",
            status="completed",
            episode_updates={episode_id: {"episodeSummaryPath": str(summary_output)}},
        )

    timeline_output = paths["timeline"] / "event_timeline.json"
    run_step([
        sys.executable,
        str(SCRIPT_DIR / "03_build_event_timeline.py"),
        *summary_paths,
        "-o",
        str(timeline_output),
    ])
    update_manifest_stage(
        paths["manifest"],
        args.drama_id,
        "event_timeline",
        status="completed",
        artifacts={"eventTimelinePath": str(timeline_output)},
    )

    series_output = paths["series"] / "series_overview.json"
    series_command = [
        sys.executable,
        str(SCRIPT_DIR / "04_build_series_overview.py"),
        *summary_paths,
        "-o",
        str(series_output),
    ]
    if args.use_llm:
        series_command.append("--use-llm")
    if args.model:
        series_command.extend(["--model", args.model])
    run_step(series_command)
    update_manifest_stage(
        paths["manifest"],
        args.drama_id,
        "series_overview",
        status="completed",
        artifacts={"seriesOverviewPath": str(series_output)},
    )

    tail_summary_path = paths["episode_summaries"] / f"{args.tail_episode_id}.json"
    if not tail_summary_path.exists():
        raise SystemExit(f"Tail episode summary not found: {tail_summary_path}")

    tail_output = paths["tail"] / "tail_state_snapshot.json"
    tail_command = [
        sys.executable,
        str(SCRIPT_DIR / "05_build_tail_snapshot.py"),
        "--tail-summary",
        str(tail_summary_path),
        "--timeline",
        str(timeline_output),
        "--series-overview",
        str(series_output),
        "-o",
        str(tail_output),
    ]
    if args.use_llm:
        tail_command.append("--use-llm")
    if args.model:
        tail_command.extend(["--model", args.model])
    run_step(tail_command)
    update_manifest_stage(
        paths["manifest"],
        args.drama_id,
        "tail_snapshot",
        status="completed",
        artifacts={"tailStateSnapshotPath": str(tail_output)},
    )

    package_output = paths["package"] / "story_context_package.json"
    run_step([
        sys.executable,
        str(SCRIPT_DIR / "06_assemble_story_context.py"),
        "--drama-id",
        args.drama_id,
        "--series-overview",
        str(series_output),
        "--timeline",
        str(timeline_output),
        "--tail-snapshot",
        str(tail_output),
        "--episode-summaries",
        *summary_paths,
        "-o",
        str(package_output),
    ])
    update_manifest_stage(
        paths["manifest"],
        args.drama_id,
        "story_context_package",
        status="completed",
        artifacts={"storyContextPackagePath": str(package_output)},
    )

    print(f"Story context pipeline complete for {args.drama_id}")
    print(f"  manifest: {paths['manifest']}")
    print(f"  package: {package_output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
