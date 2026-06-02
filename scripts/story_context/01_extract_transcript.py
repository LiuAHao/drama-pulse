#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path
from typing import Any

from common import guess_episode_no, read_json, write_json


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = REPO_ROOT / "server" / "data" / "app.db"


def load_episode_metadata(db_path: Path, drama_id: str, episode_id: str) -> dict[str, Any]:
    if not db_path.exists() or not drama_id or not episode_id:
        return {}

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            """
            select
              d.id as dramaId,
              d.title as dramaTitle,
              d.main_genre as mainGenre,
              e.id as episodeId,
              e.title as episodeTitle,
              e.summary as episodeSummary,
              e.episode_no as episodeNo
            from episodes e
            join dramas d on d.id = e.drama_id
            where d.id = ? and e.id = ?
            """,
            (drama_id, episode_id),
        ).fetchone()
    finally:
        conn.close()

    return dict(row) if row else {}


def normalize_segments(raw_segments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    for index, raw_segment in enumerate(raw_segments, start=1):
        if "startTimeMs" in raw_segment and "endTimeMs" in raw_segment:
            start_ms = int(raw_segment["startTimeMs"])
            end_ms = int(raw_segment["endTimeMs"])
        else:
            start_ms = int(raw_segment["start_time"])
            end_ms = int(raw_segment["end_time"])
        text = str(raw_segment.get("text", "")).strip()
        if not text:
            continue
        segments.append({
            "segmentId": raw_segment.get("segmentId", f"seg_{index:04d}"),
            "startTimeMs": start_ms,
            "endTimeMs": end_ms,
            "text": text,
            "speakerGuess": raw_segment.get("speakerGuess"),
            "targetCharacterGuess": raw_segment.get("targetCharacterGuess"),
            "mentionedCharacters": raw_segment.get("mentionedCharacters", []),
            "characterGuessConfidence": raw_segment.get("characterGuessConfidence"),
        })
    return segments


def build_transcript(
    payload: dict[str, Any],
    metadata: dict[str, Any],
    args: argparse.Namespace,
) -> dict[str, Any]:
    episode_id = args.episode_id or payload.get("episodeId") or "episode_unknown"
    drama_id = args.drama_id or payload.get("dramaId") or "drama_unknown"
    segments = normalize_segments(payload.get("segments", []))
    if not segments:
        raise ValueError("No valid segments found in input payload")

    return {
        "dramaId": drama_id,
        "episodeId": episode_id,
        "episodeNo": payload.get("episodeNo") or metadata.get("episodeNo") or guess_episode_no(episode_id),
        "dramaTitle": args.drama_title or payload.get("dramaTitle", "") or metadata.get("dramaTitle", ""),
        "episodeTitle": args.episode_title or payload.get("episodeTitle", "") or metadata.get("episodeTitle", ""),
        "episodeSummary": payload.get("episodeSummary", "") or metadata.get("episodeSummary", ""),
        "mainGenre": args.main_genre or payload.get("mainGenre", "") or metadata.get("mainGenre", ""),
        "characterRelationshipSummary": payload.get("characterRelationshipSummary", ""),
        "episodeConflictSummary": payload.get("episodeConflictSummary", ""),
        "audienceStanceHint": payload.get("audienceStanceHint", ""),
        "toneHint": payload.get("toneHint", ""),
        "source": args.source or payload.get("source") or payload.get("backend") or "unknown",
        "language": payload.get("language", "zh"),
        "segments": segments,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Standardize transcript payload for story context pipeline.")
    parser.add_argument("input", help="Raw ASR JSON or normalized transcript JSON")
    parser.add_argument("-o", "--output", required=True, help="Output transcript JSON path")
    parser.add_argument("--drama-id", default="", help="Override drama id")
    parser.add_argument("--episode-id", default="", help="Override episode id")
    parser.add_argument("--drama-title", default="", help="Override drama title")
    parser.add_argument("--episode-title", default="", help="Override episode title")
    parser.add_argument("--main-genre", default="", help="Override main genre")
    parser.add_argument("--source", default="", help="Override source label")
    parser.add_argument("--db-path", default=str(DEFAULT_DB_PATH), help="SQLite db path for metadata lookup")
    args = parser.parse_args()

    payload = read_json(args.input)
    drama_id = args.drama_id or payload.get("dramaId") or ""
    episode_id = args.episode_id or payload.get("episodeId") or ""
    metadata = load_episode_metadata(Path(args.db_path), drama_id, episode_id)
    transcript = build_transcript(payload, metadata, args)
    write_json(args.output, transcript)
    print(f"Saved transcript to: {Path(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
