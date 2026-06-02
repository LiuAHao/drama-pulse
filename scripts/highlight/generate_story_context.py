#!/usr/bin/env python3
"""
Generate episode-level story context from transcript + metadata.

This script creates a structured context package that later highlight scripts can consume:
- episodeSummary
- characterRelationshipSummary
- episodeConflictSummary
- audienceStanceHint
- toneHint

Usage:
    python generate_story_context.py transcript.json -o episode-context.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from openai import OpenAI

from deepseek_client import DEFAULT_ENV_FILES, create_deepseek_client, load_env_files


def build_system_prompt() -> str:
    return """你是 Drama Pulse 的剧情上下文整理助手。

你的任务是根据一集短剧的 transcript 和基础元数据，生成后续高光识别要用的剧情上下文包。

要求：
1. 输出必须是单个 JSON 对象，不要输出解释文字。
2. 字段必须包含：
   - episodeSummary
   - characterRelationshipSummary
   - episodeConflictSummary
   - audienceStanceHint
   - toneHint
3. 所有字段都必须是简洁中文字符串。
4. episodeSummary 控制在 1 到 3 句话。
5. characterRelationshipSummary 要说清谁和谁是什么关系、观众容易站哪边。
6. episodeConflictSummary 要写出本集最核心的矛盾或压力来源。
7. audienceStanceHint 要明确告诉后续模型观众更容易共情和站队谁。
8. toneHint 要概括这一集整体情绪走向，比如“前半压抑冲突，后半迎来转机”。
9. 不要编造超出 transcript 明显范围的细节。"""


def truncate_segments(segments: list[dict[str, Any]], head: int = 24, tail: int = 20) -> list[dict[str, Any]]:
    if len(segments) <= head + tail:
        return segments
    return segments[:head] + [{"segmentId": "...", "startTimeMs": 0, "endTimeMs": 0, "text": "……中间片段省略……"}] + segments[-tail:]


def build_user_prompt(transcript: dict[str, Any]) -> str:
    visible_segments = truncate_segments(transcript.get("segments", []))
    segment_lines = []
    for seg in visible_segments:
        segment_lines.append(
            f"[{seg['segmentId']}|{seg['startTimeMs']}-{seg['endTimeMs']}] {seg['text']}"
        )

    return "\n".join([
        "剧集基础信息：",
        f"- dramaId: {transcript.get('dramaId', '')}",
        f"- dramaTitle: {transcript.get('dramaTitle', '')}",
        f"- episodeId: {transcript.get('episodeId', '')}",
        f"- episodeTitle: {transcript.get('episodeTitle', '')}",
        f"- mainGenre: {transcript.get('mainGenre', '')}",
        f"- 已有 episodeSummary: {transcript.get('episodeSummary', '')}",
        f"- 已有 characterRelationshipSummary: {transcript.get('characterRelationshipSummary', '')}",
        "",
        "transcript 摘要片段：",
        *segment_lines,
        "",
        "请根据这些信息输出本集的剧情上下文 JSON。",
    ])


def extract_json_object(text: str) -> dict[str, Any]:
    content = text.strip()
    if content.startswith("```"):
        content = content.strip("`")
        if content.startswith("json"):
            content = content[4:].strip()
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start == -1 or end == -1:
            raise
        parsed = json.loads(content[start:end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("model output is not a JSON object")
    return parsed


def generate_context(transcript: dict[str, Any], model_override: str = "") -> dict[str, Any]:
    env = load_env_files(DEFAULT_ENV_FILES)
    client, default_model = create_deepseek_client(
        env,
        purpose="story context generation",
        model_env_keys=("DEEPSEEK_HIGHLIGHT_CONTEXT_MODEL",),
    )
    model = model_override or default_model
    response = client.chat.completions.create(
        model=model,
        temperature=0.1,
        messages=[
            {"role": "system", "content": build_system_prompt()},
            {"role": "user", "content": build_user_prompt(transcript)},
        ],
    )
    content = response.choices[0].message.content or "{}"
    return extract_json_object(content)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate episode-level story context JSON from transcript.")
    parser.add_argument("input", type=str, help="Path to transcript JSON")
    parser.add_argument("-o", "--output", type=str, default="", help="Output story context JSON path")
    parser.add_argument("--model", type=str, default="", help="Override model name")
    args = parser.parse_args()

    input_path = Path(args.input)
    transcript = json.loads(input_path.read_text(encoding="utf-8"))
    context = generate_context(transcript, model_override=args.model)

    merged = {
        "dramaId": transcript.get("dramaId", ""),
        "episodeId": transcript.get("episodeId", ""),
        "dramaTitle": transcript.get("dramaTitle", ""),
        "episodeTitle": transcript.get("episodeTitle", ""),
        "mainGenre": transcript.get("mainGenre", ""),
        **context,
    }

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Saved story context to: {output_path}")
    else:
        print(json.dumps(merged, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
