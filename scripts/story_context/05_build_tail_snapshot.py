#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from common import create_llm_client, extract_json_object, read_json, shorten_text, write_json


def build_fallback_snapshot(
    tail_summary: dict[str, Any],
    timeline: dict[str, Any],
    series_overview: dict[str, Any],
) -> dict[str, Any]:
    recent_events = timeline.get("events", [])[-3:]
    branch_points = [shorten_text(event.get("event", ""), limit=72) for event in recent_events if event.get("event")]
    unresolved = tail_summary.get("openQuestions", [])
    return {
        "episodeId": tail_summary.get("episodeId", ""),
        "episodeNo": tail_summary.get("episodeNo", 0),
        "currentConflict": tail_summary.get("episodeEndingState", "") or tail_summary.get("summary", ""),
        "whoKnowsWhat": [],
        "relationshipStates": [],
        "aliveStatus": [],
        "unresolvedQuestions": unresolved,
        "branchEntryPoints": branch_points,
        "hardConstraints": series_overview.get("canonConstraints", []),
    }


def build_system_prompt() -> str:
    return """你是短剧尾集状态快照整理助手。

请根据尾集摘要、时间线和全剧层信息，输出单个 JSON 对象，字段必须包含：
- episodeId（必须严格复用输入尾集的 episodeId）
- episodeNo（必须严格复用输入尾集的 episodeNo）
- currentConflict
- whoKnowsWhat
- relationshipStates
- aliveStatus
- unresolvedQuestions
- branchEntryPoints
- hardConstraints

要求：
1. 输出 JSON，不要解释。
2. 聚焦“尾集结束这一刻”的事实状态。
3. 不要编造 transcript 没有支撑的设定。"""


def build_user_prompt(tail_summary: dict[str, Any], timeline: dict[str, Any], series_overview: dict[str, Any]) -> str:
    event_lines = [f"- {event.get('event', '')}" for event in timeline.get("events", [])[-5:]]
    return "\n".join([
        f"尾集摘要: {tail_summary.get('summary', '')}",
        f"尾集关键事件: {' / '.join(tail_summary.get('keyEvents', [])[:4])}",
        f"尾集未解问题: {' / '.join(tail_summary.get('openQuestions', [])[:4])}",
        f"全剧主冲突: {series_overview.get('mainConflict', '')}",
        "近期事件时间线:",
        *event_lines,
        "",
        "请输出尾集快照 JSON。",
    ])


def generate_with_llm(
    tail_summary: dict[str, Any],
    timeline: dict[str, Any],
    series_overview: dict[str, Any],
    model_override: str = "",
) -> dict[str, Any]:
    client, default_model = create_llm_client(
        purpose="story context tail snapshot generation",
        model_env_keys=("DEEPSEEK_STORY_CONTEXT_MODEL",),
    )
    response = client.chat.completions.create(
        model=model_override or default_model,
        temperature=0.1,
        messages=[
            {"role": "system", "content": build_system_prompt()},
            {"role": "user", "content": build_user_prompt(tail_summary, timeline, series_overview)},
        ],
    )
    content = response.choices[0].message.content or "{}"
    return extract_json_object(content)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build tail-state snapshot for story context pipeline.")
    parser.add_argument("--tail-summary", required=True, help="Tail episode summary JSON path")
    parser.add_argument("--timeline", required=True, help="Event timeline JSON path")
    parser.add_argument("--series-overview", required=True, help="Series overview JSON path")
    parser.add_argument("-o", "--output", required=True, help="Output tail snapshot JSON path")
    parser.add_argument("--use-llm", action="store_true", help="Use LLM instead of fallback heuristic")
    parser.add_argument("--model", default="", help="Override model name")
    args = parser.parse_args()

    tail_summary = read_json(args.tail_summary)
    timeline = read_json(args.timeline)
    series_overview = read_json(args.series_overview)
    snapshot = (
        generate_with_llm(tail_summary, timeline, series_overview, args.model)
        if args.use_llm
        else build_fallback_snapshot(tail_summary, timeline, series_overview)
    )
    output = {
        "dramaId": tail_summary.get("dramaId", ""),
        "generator": "llm" if args.use_llm else "fallback",
        **snapshot,
        "episodeId": tail_summary.get("episodeId", ""),
        "episodeNo": tail_summary.get("episodeNo", 0),
    }
    write_json(args.output, output)
    print(f"Saved tail snapshot to: {Path(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
