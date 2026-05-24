#!/usr/bin/env python3
"""
Import validated highlight candidates into the local Drama Pulse SQLite database.

Example:
    python scripts/highlight/import_candidates.py \
      data/exports/highlight-demo/episode-2-candidates-v2.json \
      --episode-id ep_001_02 \
      --replace-ai-candidates
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


def load_candidates(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("candidate file must be a JSON array")
    return payload


def ensure_episode_exists(conn: sqlite3.Connection, episode_id: str) -> None:
    row = conn.execute(
        "select id, drama_id, episode_no, title from episodes where id = ?",
        (episode_id,),
    ).fetchone()
    if row is None:
        raise ValueError(f"episode not found: {episode_id}")


def normalize_json_array(value: Any) -> str:
    if value is None:
        return "[]"
    if not isinstance(value, list):
        raise ValueError("expected JSON list field")
    return json.dumps(value, ensure_ascii=False)


def build_insert_rows(candidates: list[dict[str, Any]], episode_id: str) -> list[tuple[Any, ...]]:
    rows: list[tuple[Any, ...]] = []
    for index, candidate in enumerate(candidates, start=1):
        highlight_type = candidate.get("highlightType")
        if not highlight_type:
            raise ValueError(f"candidate[{index}] missing highlightType")

        row_id = f"ai_{episode_id}_{index:03d}"
        rows.append((
            row_id,
            episode_id,
            int(candidate["startTimeMs"]),
            int(candidate["endTimeMs"]),
            str(highlight_type),
            str(candidate.get("title", "")).strip(),
            str(candidate.get("description", "")).strip(),
            int(candidate.get("intensity", 3)),
            str(candidate.get("templateId", "")).strip(),
            json.dumps(candidate.get("interactionOptions", []), ensure_ascii=False),
            "",
            str(candidate.get("source", "ai")).strip() or "ai",
            float(candidate.get("confidence", 0.7)),
            str(candidate.get("status", "candidate")).strip() or "candidate",
            str(candidate.get("reason", "")).strip(),
            normalize_json_array(candidate.get("supportingSegmentIds", [])),
            str(candidate.get("speakerGuess") or ""),
            str(candidate.get("targetCharacterGuess") or ""),
            normalize_json_array(candidate.get("mentionedCharacters", [])),
            candidate.get("characterGuessConfidence"),
        ))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Import highlight candidates into Drama Pulse SQLite DB.")
    parser.add_argument("input", type=str, help="Validated candidate JSON path")
    parser.add_argument("--episode-id", required=True, help="Target DB episode id, e.g. ep_001_02")
    parser.add_argument("--db-path", type=str, default=str(DEFAULT_DB_PATH), help="SQLite db path")
    parser.add_argument(
        "--replace-ai-candidates",
        action="store_true",
        help="Delete existing ai/candidate rows for the target episode before import",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    db_path = Path(args.db_path)

    if not input_path.exists():
        print(f"Error: candidate file not found: {input_path}", file=sys.stderr)
        return 1
    if not db_path.exists():
        print(f"Error: db file not found: {db_path}", file=sys.stderr)
        return 1

    candidates = load_candidates(input_path)
    rows = build_insert_rows(candidates, args.episode_id)

    conn = sqlite3.connect(db_path)
    try:
        ensure_episode_exists(conn, args.episode_id)

        if args.replace_ai_candidates:
            conn.execute(
                "delete from highlights where episode_id = ? and source = 'ai' and status = 'candidate'",
                (args.episode_id,),
            )

        conn.executemany(
            """
            insert into highlights (
              id, episode_id, start_time_ms, end_time_ms, type, title, description,
              intensity, template_id, interaction_options_json, visual_effect_type,
              source, confidence, status, reason, supporting_segment_ids_json,
              speaker_guess, target_character_guess, mentioned_characters_json,
              character_guess_confidence, created_at, updated_at
            ) values (
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?,
              ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            """,
            rows,
        )
        conn.commit()
    finally:
        conn.close()

    print(f"Imported {len(rows)} candidates into {db_path} for episode {args.episode_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
