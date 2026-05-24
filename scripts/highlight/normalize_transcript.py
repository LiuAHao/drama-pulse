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
import sys
from pathlib import Path
from typing import Any


def normalize_transcript(
    raw: dict[str, Any],
    drama_id: str,
    episode_id: str,
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
        "source": f"asrtools_{resolved_source}" if not source.startswith("asrtools_") else source,
        "language": "zh",
        "segments": segments,
    }


def validate_transcript(transcript: dict[str, Any]) -> list[str]:
    errors = []
    required_top = ["dramaId", "episodeId", "source", "language", "segments"]
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
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        return 1

    raw = json.loads(input_path.read_text(encoding="utf-8"))

    try:
        transcript = normalize_transcript(
            raw=raw,
            drama_id=args.drama_id,
            episode_id=args.episode_id,
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
