#!/usr/bin/env python3
"""
Normalize raw ASR results into Drama Pulse transcript JSON format.

Input:  Raw ASR JSON from transcribe_episode.py (or any compatible format)
Output: Drama Pulse transcript JSON with dramaId, episodeId, source, language, segments[]

Usage:
    python normalize_transcript.py raw_asr.json -o transcript.json
    python normalize_transcript.py raw_asr.json --drama-id drama_001 --episode-id episode_001
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = REPO_ROOT / "server" / "data" / "app.db"
DEFAULT_STORY_CONTEXT_PATH = REPO_ROOT / "data" / "seed" / "story_context.json"


def load_story_context(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def load_episode_metadata(db_path: Path, drama_id: str, episode_id: str) -> dict[str, Any]:
    if not db_path.exists():
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
              e.summary as episodeSummary
            from episodes e
            join dramas d on d.id = e.drama_id
            where d.id = ? and e.id = ?
            """,
            (drama_id, episode_id),
        ).fetchone()
    finally:
        conn.close()

    return dict(row) if row else {}


def merge_story_context(
    drama_id: str,
    episode_id: str,
    metadata: dict[str, Any],
    story_context: dict[str, Any],
    overrides: dict[str, str],
) -> dict[str, Any]:
    drama_context = story_context.get(drama_id, {}) if isinstance(story_context, dict) else {}
    episode_context = drama_context.get("episodes", {}).get(episode_id, {})

    def pick(*values: Any) -> str:
        for value in values:
            if isinstance(value, str) and value.strip():
                return value.strip()
        return ""

    return {
        "dramaTitle": pick(
            overrides.get("dramaTitle"),
            metadata.get("dramaTitle"),
            drama_context.get("dramaTitle"),
        ),
        "episodeTitle": pick(
            overrides.get("episodeTitle"),
            metadata.get("episodeTitle"),
            episode_context.get("episodeTitle"),
        ),
        "episodeSummary": pick(
            overrides.get("episodeSummary"),
            episode_context.get("episodeSummary"),
            metadata.get("episodeSummary"),
        ),
        "mainGenre": pick(
            overrides.get("mainGenre"),
            metadata.get("mainGenre"),
            drama_context.get("mainGenre"),
        ),
        "characterRelationshipSummary": pick(
            overrides.get("characterRelationshipSummary"),
            episode_context.get("characterRelationshipSummary"),
            drama_context.get("characterRelationshipSummary"),
        ),
        "episodeConflictSummary": pick(
            overrides.get("episodeConflictSummary"),
            episode_context.get("episodeConflictSummary"),
        ),
        "audienceStanceHint": pick(
            overrides.get("audienceStanceHint"),
            episode_context.get("audienceStanceHint"),
            drama_context.get("defaultAudienceStance"),
        ),
        "toneHint": pick(
            overrides.get("toneHint"),
            episode_context.get("toneHint"),
        ),
    }


def normalize_transcript(
    raw: dict[str, Any],
    drama_id: str,
    episode_id: str,
    context: dict[str, str],
    source: str = "",
) -> dict[str, Any]:
    raw_segments = raw.get("segments", [])
    if not raw_segments:
        raise ValueError("No segments found in raw ASR data")

    segments = []
    for index, seg in enumerate(raw_segments, start=1):
        missing_fields = [field for field in ["start_time", "end_time", "text"] if field not in seg]
        if missing_fields:
            raise ValueError(
                f"Segment {index} missing required fields: {', '.join(missing_fields)}"
            )

        start_time = int(seg["start_time"])
        end_time = int(seg["end_time"])
        if start_time >= end_time:
            raise ValueError(f"Segment {index} has invalid time range: {start_time} >= {end_time}")

        segments.append({
            "segmentId": f"seg_{index:04d}",
            "startTimeMs": start_time,
            "endTimeMs": end_time,
            "text": seg["text"],
            "speakerGuess": None,
            "targetCharacterGuess": None,
            "mentionedCharacters": [],
            "characterGuessConfidence": None,
        })

    resolved_source = source or raw.get("backend", "unknown")

    return {
        "dramaId": drama_id,
        "episodeId": episode_id,
        "dramaTitle": context.get("dramaTitle", ""),
        "episodeTitle": context.get("episodeTitle", ""),
        "episodeSummary": context.get("episodeSummary", ""),
        "mainGenre": context.get("mainGenre", ""),
        "characterRelationshipSummary": context.get("characterRelationshipSummary", ""),
        "episodeConflictSummary": context.get("episodeConflictSummary", ""),
        "audienceStanceHint": context.get("audienceStanceHint", ""),
        "toneHint": context.get("toneHint", ""),
        "source": f"asrtools_{resolved_source}" if not source.startswith("asrtools_") else source,
        "language": "zh",
        "segments": segments,
    }


def validate_transcript(transcript: dict[str, Any]) -> list[str]:
    errors = []
    required_top = [
        "dramaId",
        "episodeId",
        "dramaTitle",
        "episodeTitle",
        "episodeSummary",
        "mainGenre",
        "characterRelationshipSummary",
        "episodeConflictSummary",
        "audienceStanceHint",
        "toneHint",
        "source",
        "language",
        "segments",
    ]
    for field in required_top:
        if field not in transcript:
            errors.append(f"Missing top-level field: {field}")

    segments = transcript.get("segments", [])
    if not segments:
        errors.append("segments is empty")

    for i, seg in enumerate(segments):
        for field in [
            "segmentId",
            "startTimeMs",
            "endTimeMs",
            "text",
            "speakerGuess",
            "targetCharacterGuess",
            "mentionedCharacters",
            "characterGuessConfidence",
        ]:
            if field not in seg:
                errors.append(f"Segment {i} missing field: {field}")
        if "startTimeMs" in seg and "endTimeMs" in seg:
            if seg["startTimeMs"] >= seg["endTimeMs"]:
                errors.append(f"Segment {i}: startTimeMs >= endTimeMs")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize ASR result to Drama Pulse transcript JSON.")
    parser.add_argument("input", type=str, help="Path to raw ASR JSON")
    parser.add_argument("-o", "--output", type=str, default="", help="Output transcript JSON path")
    parser.add_argument("--drama-id", type=str, default="drama_unknown", help="Drama ID")
    parser.add_argument("--episode-id", type=str, default="episode_unknown", help="Episode ID")
    parser.add_argument("--source", type=str, default="", help="Override source label")
    parser.add_argument("--db-path", type=str, default=str(DEFAULT_DB_PATH), help="SQLite db path for episode metadata lookup")
    parser.add_argument("--story-context", type=str, default=str(DEFAULT_STORY_CONTEXT_PATH), help="Supplemental story context JSON")
    parser.add_argument("--drama-title", type=str, default="", help="Override drama title")
    parser.add_argument("--episode-title", type=str, default="", help="Override episode title")
    parser.add_argument("--episode-summary", type=str, default="", help="Override episode summary")
    parser.add_argument("--main-genre", type=str, default="", help="Override main genre")
    parser.add_argument(
        "--character-relationship-summary",
        type=str,
        default="",
        help="Override character relationship summary",
    )
    parser.add_argument("--episode-conflict-summary", type=str, default="", help="Override episode conflict summary")
    parser.add_argument("--audience-stance-hint", type=str, default="", help="Override audience stance hint")
    parser.add_argument("--tone-hint", type=str, default="", help="Override tone hint")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        return 1

    raw = json.loads(input_path.read_text(encoding="utf-8"))
    metadata = load_episode_metadata(Path(args.db_path), args.drama_id, args.episode_id)
    story_context = load_story_context(Path(args.story_context))
    context = merge_story_context(
        drama_id=args.drama_id,
        episode_id=args.episode_id,
        metadata=metadata,
        story_context=story_context,
        overrides={
            "dramaTitle": args.drama_title,
            "episodeTitle": args.episode_title,
            "episodeSummary": args.episode_summary,
            "mainGenre": args.main_genre,
            "characterRelationshipSummary": args.character_relationship_summary,
            "episodeConflictSummary": args.episode_conflict_summary,
            "audienceStanceHint": args.audience_stance_hint,
            "toneHint": args.tone_hint,
        },
    )

    try:
        transcript = normalize_transcript(
            raw=raw,
            drama_id=args.drama_id,
            episode_id=args.episode_id,
            context=context,
            source=args.source,
        )
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    errors = validate_transcript(transcript)
    if errors:
        print("Validation warnings:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(transcript, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Saved transcript to: {output_path}")
    else:
        print(json.dumps(transcript, ensure_ascii=False, indent=2))

    print(f"Normalized: {len(transcript['segments'])} segments, drama={transcript['dramaId']}, episode={transcript['episodeId']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
