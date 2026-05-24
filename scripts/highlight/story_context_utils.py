from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def merge_transcript_with_story_context(
    transcript: dict[str, Any],
    story_context: dict[str, Any] | None,
) -> dict[str, Any]:
    if not story_context:
        return transcript

    merged = dict(transcript)
    for field in [
        "dramaTitle",
        "episodeTitle",
        "episodeSummary",
        "mainGenre",
        "characterRelationshipSummary",
        "episodeConflictSummary",
        "audienceStanceHint",
        "toneHint",
    ]:
        value = story_context.get(field)
        if isinstance(value, str) and value.strip():
            merged[field] = value.strip()
    return merged


def load_story_context_file(path: str | Path | None) -> dict[str, Any] | None:
    if not path:
        return None
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"story context file not found: {p}")
    return json.loads(p.read_text(encoding="utf-8"))
