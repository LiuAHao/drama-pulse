#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sqlite3
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
DEFAULT_DB_PATH = REPO_ROOT / "server" / "data" / "app.db"


def run_step(command: list[str]) -> None:
    print(">", " ".join(command))
    result = subprocess.run(command, cwd=REPO_ROOT)
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def load_drama_metadata(db_path: Path, drama_id: str) -> tuple[str, str, list[dict[str, str | int]]]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        drama_row = conn.execute(
            "select id, title, main_genre from dramas where id = ?",
            (drama_id,),
        ).fetchone()
        if not drama_row:
            raise SystemExit(f"Drama not found in db: {drama_id}")

        episode_rows = conn.execute(
            """
            select id, title, episode_no
            from episodes
            where drama_id = ?
            order by episode_no asc
            """,
            (drama_id,),
        ).fetchall()
    finally:
        conn.close()

    return (
        str(drama_row["title"]),
        str(drama_row["main_genre"] or ""),
        [dict(row) for row in episode_rows],
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate story context package from full episode videos.")
    parser.add_argument("--drama-id", required=True, help="Drama id")
    parser.add_argument("--video-dir", required=True, help="Directory containing full-episode mp4 files")
    parser.add_argument("--tail-episode-id", default="", help="Override tail episode id")
    parser.add_argument("--db-path", default=str(DEFAULT_DB_PATH), help="SQLite db path")
    parser.add_argument("--output-root", default="", help="Output root for story context package")
    parser.add_argument("--working-root", default="", help="Working root for extracted audio and raw ASR")
    parser.add_argument("--use-llm", action="store_true", help="Use LLM for summary/overview/snapshot stages")
    parser.add_argument("--model", default="", help="Override model name")
    args = parser.parse_args()

    db_path = Path(args.db_path)
    video_dir = Path(args.video_dir)
    working_root = (
        Path(args.working_root).resolve()
        if args.working_root
        else REPO_ROOT / "artifacts" / "story_context_inputs" / args.drama_id
    )
    working_root.mkdir(parents=True, exist_ok=True)

    drama_title, main_genre, episodes = load_drama_metadata(db_path, args.drama_id)
    episode_inputs: list[str] = []

    for episode in episodes:
        episode_no = int(episode["episode_no"])
        episode_id = str(episode["id"])
        video_path = video_dir / f"第{episode_no}集.mp4"
        if not video_path.exists():
            raise SystemExit(f"Video not found for episode {episode_id}: {video_path}")

        episode_dir = working_root / f"ep{episode_no:02d}"
        episode_dir.mkdir(parents=True, exist_ok=True)
        audio_path = episode_dir / f"episode-{episode_no}.mp3"
        raw_asr_path = episode_dir / f"episode-{episode_no}-raw-asr.json"

        if not audio_path.exists():
            run_step([
                sys.executable,
                str(REPO_ROOT / "scripts" / "highlight" / "extract_audio.py"),
                str(video_path),
                "-o",
                str(audio_path),
            ])

        if not raw_asr_path.exists():
            run_step([
                sys.executable,
                str(REPO_ROOT / "scripts" / "highlight" / "transcribe_episode.py"),
                str(audio_path),
                "-o",
                str(raw_asr_path),
            ])

        episode_inputs.append(f"{episode_id}={raw_asr_path}")

    tail_episode_id = args.tail_episode_id or str(episodes[-1]["id"])
    pipeline_command = [
        sys.executable,
        str(SCRIPT_DIR / "run_story_context_pipeline.py"),
        "--drama-id",
        args.drama_id,
        "--tail-episode-id",
        tail_episode_id,
        "--drama-title",
        drama_title,
        "--main-genre",
        main_genre,
    ]
    for episode_input in episode_inputs:
        pipeline_command.extend(["--episode-input", episode_input])
    if args.output_root:
        pipeline_command.extend(["--output-root", str(Path(args.output_root).resolve())])
    if args.use_llm:
        pipeline_command.append("--use-llm")
    if args.model:
        pipeline_command.extend(["--model", args.model])

    run_step(pipeline_command)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
