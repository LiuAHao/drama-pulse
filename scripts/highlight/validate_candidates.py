#!/usr/bin/env python3
"""
Validate and normalize highlight candidate JSON.

Supports both Seedance initial candidates and DeepSeek-reviewed candidates.

Input:
- JSON array from detect_highlights.py (Seedance) or review_highlights.py (DeepSeek)

Output:
- normalized candidate JSON array (rejected candidates filtered out)

Usage:
    python validate_candidates.py candidates.json -o validated.json
    python validate_candidates.py reviewed.json -o final.json --filter-reviewed
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

VALID_DECISIONS = {"approve", "reject", "merge", "revise"}
FINAL_PASS_DECISIONS = {"approve", "revise"}

DEFAULT_INTERACTION_APPEAR_OFFSET_MS = 600
DEFAULT_INTERACTION_END_EXTRA_MS = 1500
MAX_INTERACTION_APPEAR_OFFSET_MS = 3000
MAX_INTERACTION_END_EXTRA_MS = 3000


def map_visual_effect_type(highlight_type: str, intensity: int) -> str:
    if intensity <= 2:
        return "danmaku_float"
    if intensity == 3:
        return {
            "feel_good": "reaction_chip",
            "reversal": "reaction_chip",
            "conflict": "vote_pulse",
            "sweet": "heart_hint",
            "suspense": "suspense_hint",
        }[highlight_type]
    return {
        "feel_good": "burst_cheer",
        "reversal": "shock_flash",
        "conflict": "impact_vote_wave",
        "sweet": "heart_frame_bloom",
        "suspense": "countdown_lock",
    }[highlight_type]


class CandidateValidationError(ValueError):
    """Raised when candidate payload cannot be normalized safely."""


def clamp_interaction_appear_ms(
    start_time_ms: int,
    end_time_ms: int,
    interaction_start_ms: int,
    interaction_appear_ms: int | None,
) -> int:
    if interaction_appear_ms is None:
        interaction_appear_ms = start_time_ms + DEFAULT_INTERACTION_APPEAR_OFFSET_MS
    # Keep appear time inside the interactive window and within the highlight body.
    max_appear_ms = min(end_time_ms, interaction_start_ms + MAX_INTERACTION_APPEAR_OFFSET_MS)
    return max(interaction_start_ms, min(int(interaction_appear_ms), max_appear_ms))


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

    result: dict[str, Any] = {
        "episodeId": episode_id,
        "startTimeMs": start_time_ms,
        "endTimeMs": end_time_ms,
        "highlightType": highlight_type,
        "title": title,
        "description": description,
        "intensity": intensity,
        "templateId": template_id,
        "interactionOptions": interaction_options,
        "visualEffectType": map_visual_effect_type(highlight_type, intensity),
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

    # DeepSeek review fields (pass through if present)
    review_decision = candidate.get("reviewDecision")
    if review_decision and review_decision in VALID_DECISIONS:
        result["reviewDecision"] = review_decision
        result["approved"] = bool(candidate.get("approved", review_decision != "reject"))
        result["reviewReason"] = str(candidate.get("reviewReason", "")).strip()
    else:
        result["reviewDecision"] = None
        result["approved"] = False
        result["reviewReason"] = ""

    # Interaction window (from DeepSeek review)
    interaction_start = candidate.get("interactionStartMs")
    interaction_appear = candidate.get("interactionAppearMs")
    interaction_end = candidate.get("interactionEndMs")
    if interaction_start is not None and interaction_end is not None:
        interaction_start_ms = int(interaction_start)
        interaction_end_ms = int(interaction_end)
        result["interactionStartMs"] = interaction_start_ms
        result["interactionAppearMs"] = clamp_interaction_appear_ms(
            start_time_ms,
            end_time_ms,
            interaction_start_ms,
            None if interaction_appear is None else int(interaction_appear),
        )
        result["interactionEndMs"] = interaction_end_ms
    else:
        result["interactionStartMs"] = start_time_ms
        result["interactionAppearMs"] = clamp_interaction_appear_ms(
            start_time_ms,
            end_time_ms,
            start_time_ms,
            None,
        )
        result["interactionEndMs"] = min(
            end_time_ms + DEFAULT_INTERACTION_END_EXTRA_MS,
            end_time_ms + MAX_INTERACTION_END_EXTRA_MS,
        )

    return result


def validate_review_fields(candidate: dict[str, Any], index: int) -> None:
    """Additional validation for DeepSeek-reviewed candidates."""
    review_decision = candidate.get("reviewDecision")
    if review_decision is not None and review_decision not in VALID_DECISIONS:
        raise CandidateValidationError(
            f"candidate[{index}] has invalid reviewDecision: {review_decision}"
        )

    interaction_start = candidate.get("interactionStartMs")
    interaction_appear = candidate.get("interactionAppearMs")
    interaction_end = candidate.get("interactionEndMs")

    if interaction_start is not None:
        if not isinstance(interaction_start, int) or interaction_start < 0:
            raise CandidateValidationError(
                f"candidate[{index}] has invalid interactionStartMs: {interaction_start}"
            )

    if interaction_appear is not None:
        if not isinstance(interaction_appear, int) or interaction_appear < 0:
            raise CandidateValidationError(
                f"candidate[{index}] has invalid interactionAppearMs: {interaction_appear}"
            )

    if interaction_end is not None:
        if not isinstance(interaction_end, int) or interaction_end <= 0:
            raise CandidateValidationError(
                f"candidate[{index}] has invalid interactionEndMs: {interaction_end}"
            )

    if interaction_start is not None and interaction_appear is not None:
        if interaction_appear < interaction_start:
            raise CandidateValidationError(
                f"candidate[{index}] interactionAppearMs must be >= interactionStartMs"
            )

    if interaction_appear is not None and interaction_end is not None:
        if interaction_end <= interaction_appear:
            raise CandidateValidationError(
                f"candidate[{index}] interactionEndMs must be > interactionAppearMs"
            )

    if interaction_start is not None and interaction_end is not None:
        if interaction_end <= interaction_start:
            raise CandidateValidationError(
                f"candidate[{index}] interactionEndMs must be > interactionStartMs"
            )

    # Interaction window should cover or be adjacent to highlight window
    start_ms = candidate.get("startTimeMs", 0)
    end_ms = candidate.get("endTimeMs", 0)
    if interaction_start is not None and interaction_start > start_ms + 3000:
        raise CandidateValidationError(
            f"candidate[{index}] interactionStartMs too far from startTimeMs"
        )
    if interaction_appear is not None and interaction_appear > end_ms + 500:
        raise CandidateValidationError(
            f"candidate[{index}] interactionAppearMs too late vs endTimeMs"
        )
    if interaction_end is not None and interaction_end < end_ms - 1000:
        raise CandidateValidationError(
            f"candidate[{index}] interactionEndMs too early vs endTimeMs"
        )


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


def validate_candidates_payload(
    payload: Any, filter_reviewed: bool = False
) -> list[dict[str, Any]]:
    if not isinstance(payload, list):
        raise CandidateValidationError("candidate payload must be a JSON array")

    normalized: list[dict[str, Any]] = []
    for index, candidate in enumerate(payload):
        try:
            nc = normalize_candidate(candidate, index)
            validate_review_fields(nc, index)
            normalized.append(nc)
        except CandidateValidationError as exc:
            print(f"Warning: skipping candidate[{index}]: {exc}", file=sys.stderr)

    # Filter out rejected candidates if requested
    if filter_reviewed:
        normalized = [
            c
            for c in normalized
            if c.get("approved") is True and c.get("reviewDecision") in FINAL_PASS_DECISIONS
        ]

    return dedupe_candidates(normalized)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate highlight candidate JSON.")
    parser.add_argument("input", type=str, help="Path to candidate JSON file")
    parser.add_argument("-o", "--output", type=str, default="", help="Output normalized JSON path")
    parser.add_argument(
        "--filter-reviewed",
        action="store_true",
        help="Filter out rejected candidates (for DeepSeek-reviewed input)",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        return 1

    try:
        payload = json.loads(input_path.read_text(encoding="utf-8"))
        normalized = validate_candidates_payload(payload, filter_reviewed=args.filter_reviewed)
    except (json.JSONDecodeError, CandidateValidationError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Saved {len(normalized)} validated candidates to: {output_path}")
    else:
        print(json.dumps(normalized, ensure_ascii=False, indent=2))

    print(f"Validated: {len(normalized)} candidates")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
