#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from common import now_iso, read_json, sort_episode_ids, write_json


def main() -> int:
    parser = argparse.ArgumentParser(description="Assemble final story context package.")
    parser.add_argument("--drama-id", required=True, help="Drama id")
    parser.add_argument("--series-overview", required=True, help="Series overview JSON path")
    parser.add_argument("--timeline", required=True, help="Event timeline JSON path")
    parser.add_argument("--tail-snapshot", required=True, help="Tail snapshot JSON path")
    parser.add_argument("--episode-summaries", nargs="+", required=True, help="Episode summary JSON paths")
    parser.add_argument("-o", "--output", required=True, help="Output story context package JSON path")
    args = parser.parse_args()

    series_overview = read_json(args.series_overview)
    timeline = read_json(args.timeline)
    tail_snapshot = read_json(args.tail_snapshot)
    episode_summaries = [read_json(path) for path in args.episode_summaries]
    episode_summaries.sort(key=lambda payload: (int(payload.get("episodeNo", 0)), payload.get("episodeId", "")))

    package = {
        "dramaId": args.drama_id,
        "version": f"{args.drama_id}-{now_iso()}",
        "generatedAt": now_iso(),
        "episodeIds": sort_episode_ids(summary.get("episodeId", "") for summary in episode_summaries),
        "seriesOverview": series_overview,
        "episodeSummaries": episode_summaries,
        "eventTimeline": timeline,
        "tailStateSnapshot": tail_snapshot,
        "characterBible": series_overview.get("characterBible", []),
        "relationshipGraph": series_overview.get("relationshipGraph", []),
        "canonConstraints": series_overview.get("canonConstraints", []),
    }
    write_json(args.output, package)
    print(f"Saved story context package to: {Path(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
