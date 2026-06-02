#!/usr/bin/env python3
from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path
from typing import Any

from common import create_llm_client, extract_json_object, read_json, shorten_text, write_json


def build_fallback_overview(episode_summaries: list[dict[str, Any]]) -> dict[str, Any]:
    first = episode_summaries[0] if episode_summaries else {}
    combined_events = [event for summary in episode_summaries for event in summary.get("keyEvents", [])]
    combined_questions = [question for summary in episode_summaries for question in summary.get("openQuestions", [])]
    focus_counter = Counter(
        name
        for summary in episode_summaries
        for name in summary.get("focusCharacters", [])
        if isinstance(name, str) and name.strip()
    )

    return {
        "seriesPremise": shorten_text("；".join(combined_events[:4]) or first.get("summary", ""), limit=180),
        "genre": [first.get("mainGenre", "")] if first.get("mainGenre") else [],
        "mainConflict": shorten_text("；".join(combined_questions[:3]) or first.get("summary", ""), limit=120),
        "tone": "情绪递进、冲突逐步升级",
        "characterBible": [
            {
                "name": name,
                "role": "待补充",
                "currentState": "待补充",
                "constraints": [],
            }
            for name, _count in focus_counter.most_common(6)
        ],
        "relationshipGraph": [],
        "canonConstraints": [
            "必须承接已发生的关键事件，不得推翻既有事实。",
            "尾集分支需要优先遵守尾集结束时的人物关系和信息差。",
        ],
    }


def build_system_prompt() -> str:
    return """你是短剧全剧设定整理助手。

请根据分集摘要输出单个 JSON 对象，字段必须包含：
- seriesPremise: 字符串
- genre: 字符串数组
- mainConflict: 字符串
- tone: 字符串
- characterBible: 对象数组，每项至少包含 name/role/currentState/constraints
- relationshipGraph: 对象数组，每项至少包含 from/to/relation
- canonConstraints: 字符串数组

要求：
1. 只输出 JSON。
2. 优先保留能支撑尾集分支生成的稳定设定。
3. 不要编造无依据的人物细节。"""


def build_user_prompt(episode_summaries: list[dict[str, Any]]) -> str:
    lines = []
    for summary in episode_summaries:
        lines.extend([
            f"- {summary.get('episodeId', '')}: {summary.get('summary', '')}",
            f"  keyEvents: {' / '.join(summary.get('keyEvents', [])[:3])}",
            f"  openQuestions: {' / '.join(summary.get('openQuestions', [])[:2])}",
        ])
    return "\n".join(["以下是全剧分集摘要：", *lines, "", "请输出全剧层 JSON。"])


def generate_with_llm(episode_summaries: list[dict[str, Any]], model_override: str = "") -> dict[str, Any]:
    client, default_model = create_llm_client(
        purpose="story context series overview generation",
        model_env_keys=("DEEPSEEK_STORY_CONTEXT_MODEL",),
    )
    response = client.chat.completions.create(
        model=model_override or default_model,
        temperature=0.1,
        messages=[
            {"role": "system", "content": build_system_prompt()},
            {"role": "user", "content": build_user_prompt(episode_summaries)},
        ],
    )
    content = response.choices[0].message.content or "{}"
    return extract_json_object(content)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build series overview from episode summaries.")
    parser.add_argument("inputs", nargs="+", help="Episode summary JSON paths")
    parser.add_argument("-o", "--output", required=True, help="Output series overview JSON path")
    parser.add_argument("--use-llm", action="store_true", help="Use LLM instead of fallback heuristic")
    parser.add_argument("--model", default="", help="Override model name")
    args = parser.parse_args()

    episode_summaries = [read_json(path) for path in args.inputs]
    episode_summaries.sort(key=lambda payload: (int(payload.get("episodeNo", 0)), payload.get("episodeId", "")))
    overview = generate_with_llm(episode_summaries, args.model) if args.use_llm else build_fallback_overview(episode_summaries)
    first = episode_summaries[0] if episode_summaries else {}
    output = {
        "dramaId": first.get("dramaId", ""),
        "generator": "llm" if args.use_llm else "fallback",
        **overview,
    }
    write_json(args.output, output)
    print(f"Saved series overview to: {Path(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
