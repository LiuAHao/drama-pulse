#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from common import (
    create_llm_client,
    extract_json_object,
    pick_segment_texts,
    read_json,
    shorten_text,
    write_json,
)


def build_fallback_summary(transcript: dict[str, Any]) -> dict[str, Any]:
    segments = transcript.get("segments", [])
    highlights = pick_segment_texts(segments)
    summary = "；".join(shorten_text(text, limit=48) for text in highlights[:3]) or transcript.get("episodeSummary", "")
    key_events = [shorten_text(text, limit=60) for text in highlights[:3]]
    open_questions = [f"尾声之后，{shorten_text(highlights[-1], limit=36)}会把故事带向哪里？"] if highlights else []

    return {
        "summary": summary or "本集围绕关键冲突推进，为尾集分支生成提供上下文。",
        "keyEvents": key_events,
        "characterChanges": [],
        "newReveals": [],
        "openQuestions": open_questions,
        "episodeEndingState": shorten_text(highlights[-1], limit=80) if highlights else "",
        "focusCharacters": [],
    }


def build_system_prompt() -> str:
    return """你是短剧剧情整理助手。

请根据 transcript 输出单集结构化摘要，输出必须是单个 JSON 对象，字段固定为：
- summary: 100字以内中文摘要
- keyEvents: 1到5条字符串数组
- characterChanges: 0到5条字符串数组
- newReveals: 0到5条字符串数组
- openQuestions: 0到5条字符串数组
- episodeEndingState: 1条中文字符串
- focusCharacters: 0到6条字符串数组

要求：
1. 不要输出解释文字。
2. 不要编造 transcript 中没有明显支撑的信息。
3. 内容服务于后续尾集分支生成，优先保留人物关系变化、冲突推进和悬念。"""


def build_user_prompt(transcript: dict[str, Any]) -> str:
    segment_lines = []
    for segment in transcript.get("segments", [])[:18]:
        segment_lines.append(
            f"[{segment['segmentId']}|{segment['startTimeMs']}-{segment['endTimeMs']}] {segment['text']}"
        )

    return "\n".join([
        f"dramaId: {transcript.get('dramaId', '')}",
        f"episodeId: {transcript.get('episodeId', '')}",
        f"episodeTitle: {transcript.get('episodeTitle', '')}",
        f"mainGenre: {transcript.get('mainGenre', '')}",
        "",
        "transcript 摘要片段：",
        *segment_lines,
        "",
        "请输出这一集的结构化摘要 JSON。",
    ])


def generate_with_llm(transcript: dict[str, Any], model_override: str = "") -> dict[str, Any]:
    client, default_model = create_llm_client(
        purpose="story context episode summary generation",
        model_env_keys=("DEEPSEEK_STORY_CONTEXT_MODEL", "DEEPSEEK_HIGHLIGHT_CONTEXT_MODEL"),
    )
    response = client.chat.completions.create(
        model=model_override or default_model,
        temperature=0.1,
        messages=[
            {"role": "system", "content": build_system_prompt()},
            {"role": "user", "content": build_user_prompt(transcript)},
        ],
    )
    content = response.choices[0].message.content or "{}"
    return extract_json_object(content)


def build_output(transcript: dict[str, Any], summary: dict[str, Any], generator: str) -> dict[str, Any]:
    segments = transcript.get("segments", [])
    duration_ms = 0
    if segments:
        duration_ms = int(segments[-1]["endTimeMs"]) - int(segments[0]["startTimeMs"])
    return {
        "dramaId": transcript.get("dramaId", ""),
        "episodeId": transcript.get("episodeId", ""),
        "episodeNo": transcript.get("episodeNo", 0),
        "episodeTitle": transcript.get("episodeTitle", ""),
        "mainGenre": transcript.get("mainGenre", ""),
        "generator": generator,
        "summary": summary.get("summary", ""),
        "keyEvents": summary.get("keyEvents", []),
        "characterChanges": summary.get("characterChanges", []),
        "newReveals": summary.get("newReveals", []),
        "openQuestions": summary.get("openQuestions", []),
        "episodeEndingState": summary.get("episodeEndingState", ""),
        "focusCharacters": summary.get("focusCharacters", []),
        "rawTranscriptStats": {
            "segmentCount": len(segments),
            "durationMs": max(duration_ms, 0),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate episode summary for story context pipeline.")
    parser.add_argument("input", help="Transcript JSON path")
    parser.add_argument("-o", "--output", required=True, help="Output episode summary JSON path")
    parser.add_argument("--use-llm", action="store_true", help="Use LLM instead of fallback heuristic")
    parser.add_argument("--model", default="", help="Override LLM model name")
    args = parser.parse_args()

    transcript = read_json(args.input)
    if args.use_llm:
        summary = generate_with_llm(transcript, model_override=args.model)
        generator = "llm"
    else:
        summary = build_fallback_summary(transcript)
        generator = "fallback"

    write_json(args.output, build_output(transcript, summary, generator))
    print(f"Saved episode summary to: {Path(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
