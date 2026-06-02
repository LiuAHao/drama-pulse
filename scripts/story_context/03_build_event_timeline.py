#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from common import read_json, sort_episode_ids, write_json


def load_episode_summaries(paths: list[str]) -> list[dict[str, Any]]:
    payloads = [read_json(path) for path in paths]
    payloads.sort(key=lambda payload: (int(payload.get("episodeNo", 0)), payload.get("episodeId", "")))
    return payloads


def build_timeline(episode_summaries: list[dict[str, Any]]) -> dict[str, Any]:
    drama_id = episode_summaries[0].get("dramaId", "") if episode_summaries else ""
    events: list[dict[str, Any]] = []
    for episode_summary in episode_summaries:
        episode_id = episode_summary.get("episodeId", "")
        episode_no = int(episode_summary.get("episodeNo", 0))
        for index, event_text in enumerate(episode_summary.get("keyEvents", []), start=1):
            events.append({
                "eventId": f"{episode_id}_event_{index:02d}",
                "episodeId": episode_id,
                "episodeNo": episode_no,
                "order": len(events) + 1,
                "actors": episode_summary.get("focusCharacters", []),
                "event": event_text,
                "cause": episode_summary.get("summary", ""),
                "impact": episode_summary.get("episodeEndingState", ""),
                "resolved": False,
            })

    return {
        "dramaId": drama_id,
        "episodeIds": sort_episode_ids(summary.get("episodeId", "") for summary in episode_summaries),
        "events": events,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build event timeline from episode summary JSON files.")
    parser.add_argument("inputs", nargs="+", help="Episode summary JSON paths")
    parser.add_argument("-o", "--output", required=True, help="Output timeline JSON path")
    args = parser.parse_args()

    episode_summaries = load_episode_summaries(args.inputs)
    write_json(args.output, build_timeline(episode_summaries))
    print(f"Saved event timeline to: {Path(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
