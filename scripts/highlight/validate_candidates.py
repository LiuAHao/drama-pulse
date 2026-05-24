#!/usr/bin/env python3
"""
Validate and normalize highlight candidate JSON.

Input:
- JSON array from detect_highlights.py or any compatible source

Output:
- normalized candidate JSON array
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


HIGHLIGHT_TYPES = {"feel_good", "reversal", "conflict", "sweet", "suspense"}
TEMPLATE_BY_TYPE = {
    "feel_good": "emotion_button",
    "reversal": "emotion_button",
    "conflict": "vote_side",
    "sweet": "emotion_button",
    "suspense": "suspense_lock",
}
DEFAULT_OPTIONS_BY_TYPE = {
    "feel_good": ["爽了", "继续", "太顶了"],
    "reversal": ["啊？", "没想到", "细思极恐"],
    "conflict": ["别忍", "开怼", "站她"],
    "sweet": ["磕到了", "太甜了", "锁死"],
    "suspense": ["不对劲", "有坑", "继续看"],
}


class CandidateValidationError(ValueError):
    """Raised when candidate payload cannot be normalized safely."""


def _short_text_list(values: Any) -> list[str]:
    if not isinstance(values, list):
        raise CandidateValidationError("interactionOptions must be a list")
    normalized = [str(v).strip() for v in values if str(v).strip()]
    if not normalized:
        raise CandidateValidationError("interactionOptions cannot be empty")
    return normalized[:4]


def normalize_candidate(candidate: dict[str, Any], index: int) -> dict[str, Any]:
    episode_id = str(candidate.get("episodeId", "")).strip()
    if not episode_id:
        raise CandidateValidationError(f"candidate[{index}] missing episodeId")

    highlight_type = str(candidate.get("highlightType", "")).strip()
    if highlight_type not in HIGHLIGHT_TYPES:
        raise CandidateValidationError(
            f"candidate[{index}] has invalid highlightType: {highlight_type}"
        )

    try:
        start_time_ms = int(candidate.get("startTimeMs"))
        end_time_ms = int(candidate.get("endTimeMs"))
    except (TypeError, ValueError) as exc:
        raise CandidateValidationError(
            f"candidate[{index}] has invalid time fields"
        ) from exc

    if start_time_ms < 0 or end_time_ms <= start_time_ms:
        raise CandidateValidationError(
            f"candidate[{index}] has invalid time range: {start_time_ms} -> {end_time_ms}"
        )

    title = str(candidate.get("title", "")).strip()
    description = str(candidate.get("description", "")).strip()
    reason = str(candidate.get("reason", "")).strip()
    if not title or not description or not reason:
        raise CandidateValidationError(
            f"candidate[{index}] requires non-empty title, description, reason"
        )

    try:
        intensity = max(1, min(5, int(candidate.get("intensity", 3))))
    except (TypeError, ValueError) as exc:
        raise CandidateValidationError(
            f"candidate[{index}] has invalid intensity"
        ) from exc

    try:
        confidence = float(candidate.get("confidence", 0.7))
    except (TypeError, ValueError) as exc:
        raise CandidateValidationError(
            f"candidate[{index}] has invalid confidence"
        ) from exc
    confidence = max(0.0, min(1.0, confidence))

    template_id = str(candidate.get("templateId", "")).strip() or TEMPLATE_BY_TYPE[highlight_type]
    if template_id != TEMPLATE_BY_TYPE[highlight_type]:
        # 第一版严格收敛固定映射
        template_id = TEMPLATE_BY_TYPE[highlight_type]

    options_raw = candidate.get("interactionOptions") or DEFAULT_OPTIONS_BY_TYPE[highlight_type]
    interaction_options = _short_text_list(options_raw)

    supporting_segment_ids = candidate.get("supportingSegmentIds") or []
    if not isinstance(supporting_segment_ids, list):
        supporting_segment_ids = []
    supporting_segment_ids = [str(item).strip() for item in supporting_segment_ids if str(item).strip()]

    mentioned_characters = candidate.get("mentionedCharacters") or []
    if not isinstance(mentioned_characters, list):
        mentioned_characters = []
    mentioned_characters = [str(item).strip() for item in mentioned_characters if str(item).strip()]

    character_guess_confidence = candidate.get("characterGuessConfidence")
    if character_guess_confidence is not None:
        try:
            character_guess_confidence = max(0.0, min(1.0, float(character_guess_confidence)))
        except (TypeError, ValueError):
            character_guess_confidence = None

    return {
        "episodeId": episode_id,
        "startTimeMs": start_time_ms,
        "endTimeMs": end_time_ms,
        "highlightType": highlight_type,
        "title": title,
        "description": description,
        "intensity": intensity,
        "templateId": template_id,
        "interactionOptions": interaction_options,
        "reason": reason,
        "confidence": confidence,
        "status": "candidate",
        "source": "ai",
        "supportingSegmentIds": supporting_segment_ids,
        "speakerGuess": candidate.get("speakerGuess"),
        "targetCharacterGuess": candidate.get("targetCharacterGuess"),
        "mentionedCharacters": mentioned_characters,
        "characterGuessConfidence": character_guess_confidence,
    }


def dedupe_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    for candidate in sorted(candidates, key=lambda x: (x["startTimeMs"], x["endTimeMs"])):
        duplicated = next(
            (
                existing
                for existing in deduped
                if existing["episodeId"] == candidate["episodeId"]
                and existing["highlightType"] == candidate["highlightType"]
                and abs(existing["startTimeMs"] - candidate["startTimeMs"]) <= 1500
                and abs(existing["endTimeMs"] - candidate["endTimeMs"]) <= 1500
            ),
            None,
        )
        if duplicated is None:
            deduped.append(candidate)
            continue
        if candidate["confidence"] > duplicated["confidence"]:
            deduped.remove(duplicated)
            deduped.append(candidate)
    return deduped


def validate_candidates_payload(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, list):
        raise CandidateValidationError("candidate payload must be a JSON array")
    normalized = [normalize_candidate(candidate, index) for index, candidate in enumerate(payload)]
    return dedupe_candidates(normalized)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate highlight candidate JSON.")
    parser.add_argument("input", type=str, help="Path to candidate JSON file")
    parser.add_argument("-o", "--output", type=str, default="", help="Output normalized JSON path")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        return 1

    try:
        payload = json.loads(input_path.read_text(encoding="utf-8"))
        normalized = validate_candidates_payload(payload)
    except (json.JSONDecodeError, CandidateValidationError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Saved normalized candidates to: {output_path}")
    else:
        print(json.dumps(normalized, ensure_ascii=False, indent=2))

    print(f"Validated: {len(normalized)} candidates")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
