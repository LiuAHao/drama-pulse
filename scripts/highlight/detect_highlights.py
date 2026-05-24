#!/usr/bin/env python3
"""
Detect highlight candidates from Drama Pulse transcript JSON using an OpenAI-compatible LLM.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

from openai import OpenAI

from validate_candidates import validate_candidates_payload


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ENV_FILES = [REPO_ROOT / ".env", REPO_ROOT / "server" / ".env"]
DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
DEFAULT_WINDOW_SIZE = 24
DEFAULT_OVERLAP = 4
PREFERRED_MIN_DURATION_MS = 3000
PREFERRED_MAX_DURATION_MS = 12000
ABSOLUTE_MAX_DURATION_MS = 22000

HIGHLIGHT_TYPES = ["feel_good", "reversal", "conflict", "sweet", "suspense"]
TEMPLATE_BY_TYPE = {
    "feel_good": "emotion_button",
    "reversal": "emotion_button",
    "conflict": "vote_side",
    "sweet": "emotion_button",
    "suspense": "suspense_lock",
}


def load_env_files(paths: list[Path]) -> dict[str, str]:
    env: dict[str, str] = {}
    for path in paths:
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip()
    return env


def create_client(env: dict[str, str]) -> tuple[OpenAI, str]:
    api_key = os.getenv("ARK_API_KEY") or env.get("ARK_API_KEY") or os.getenv("OPENAI_API_KEY") or env.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing ARK_API_KEY / OPENAI_API_KEY")

    base_url = (
        os.getenv("ARK_BASE_URL")
        or env.get("ARK_BASE_URL")
        or os.getenv("OPENAI_BASE_URL")
        or env.get("OPENAI_BASE_URL")
        or DEFAULT_BASE_URL
    )
    model = os.getenv("ARK_ENDPOINT") or env.get("ARK_ENDPOINT") or os.getenv("ARK_MODEL") or env.get("ARK_MODEL")
    if not model:
        raise RuntimeError("Missing ARK_ENDPOINT / ARK_MODEL")

    return OpenAI(api_key=api_key, base_url=base_url), model


def chunk_segments(segments: list[dict[str, Any]], window_size: int, overlap: int) -> list[list[dict[str, Any]]]:
    chunks: list[list[dict[str, Any]]] = []
    start = 0
    step = max(1, window_size - overlap)
    while start < len(segments):
        chunks.append(segments[start : start + window_size])
        start += step
    return chunks


def format_chunk(chunk: list[dict[str, Any]]) -> str:
    lines = []
    for seg in chunk:
        lines.append(
            f"[{seg['segmentId']}|{seg['startTimeMs']}-{seg['endTimeMs']}] {seg['text']}"
        )
    return "\n".join(lines)


def build_messages(transcript: dict[str, Any], chunk: list[dict[str, Any]]) -> list[dict[str, str]]:
    episode_id = transcript["episodeId"]
    drama_id = transcript["dramaId"]
    system = f"""
你是 Drama Pulse 的高光识别助手。
你的任务是从短剧字幕片段中识别最值得互动的高光候选。

可选高光类型只有：
{", ".join(HIGHLIGHT_TYPES)}

固定模板映射：
{json.dumps(TEMPLATE_BY_TYPE, ensure_ascii=False)}

输出要求：
1. 只输出 JSON 数组，不要输出解释文字，不要使用 markdown 代码块。
2. 每个元素必须包含字段：
   episodeId, startTimeMs, endTimeMs, highlightType, title, description, intensity, templateId, interactionOptions, reason, confidence
3. 可选字段：
   supportingSegmentIds, speakerGuess, targetCharacterGuess, mentionedCharacters, characterGuessConfidence
4. interactionOptions 必须是 2-4 个简短中文短语。
5. confidence 为 0 到 1 浮点数。
6. intensity 为 1 到 5 整数。
7. startTimeMs / endTimeMs 必须来自给定片段时间范围，不要凭空生成。
8. 只有当该段确实有明显爽点、反转、冲突、甜蜜或悬念时才输出；如果没有，就返回 []。
9. 不要输出 funny 等未定义类型。
10. templateId 必须严格符合固定映射。
11. 高光必须尽量精确命中“情绪峰值片段”，不要把背景铺垫、说明性叙述、世界观交代一起打进去。
12. 优先选择 1-3 个连续 segment 组成高光；通常总时长控制在 3-12 秒，尽量不要超过 18 秒。
13. 如果真正的高光只发生在大段中的后半句或某一句，只截取那几句，不要整段都保留。
14. 如果同一窗口中既有铺垫又有爆发，优先标爆发点，不要标铺垫段。
15. supportingSegmentIds 请尽量填写，并且只列出真正支撑该高光的 segmentId。
16. 如果两个候选明显重叠，只保留更精准、更短、更像峰值的那个。
17. conflict 类型优先选择“求助被拒、争吵、打骂、翻脸、站队”的瞬间，不要选择纯苦情背景介绍。
18. feel_good 类型优先选择“转机被发现、承诺落点、爽点兑现”的瞬间，不要选宽泛正向氛围。
""".strip()

    user = f"""
剧集信息：
- dramaId: {drama_id}
- episodeId: {episode_id}

以下是本次识别片段：
{format_chunk(chunk)}

请识别这个片段窗口中最值得打标的高光候选。
如果片段里只有背景说明，没有明确情绪峰值，请返回 []。
""".strip()

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def extract_json_array(text: str) -> list[dict[str, Any]]:
    content = text.strip()
    content = re.sub(r"^```(?:json)?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\[[\s\S]*\]", content)
        if not match:
            raise
        parsed = json.loads(match.group(0))

    if not isinstance(parsed, list):
        raise ValueError("Model output is not a JSON array")
    return parsed


def detect_chunk_candidates(client: OpenAI, model: str, transcript: dict[str, Any], chunk: list[dict[str, Any]]) -> list[dict[str, Any]]:
    response = client.chat.completions.create(
        model=model,
        temperature=0.1,
        messages=build_messages(transcript, chunk),
    )
    content = response.choices[0].message.content or "[]"
    return extract_json_array(content)


def dedupe_overlapping_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    kept: list[dict[str, Any]] = []
    for candidate in sorted(candidates, key=lambda x: (x["startTimeMs"], x["endTimeMs"])):
        candidate_duration = candidate["endTimeMs"] - candidate["startTimeMs"]
        replaced = False
        for idx, existing in enumerate(kept):
            if existing["episodeId"] != candidate["episodeId"]:
                continue

            overlap_start = max(existing["startTimeMs"], candidate["startTimeMs"])
            overlap_end = min(existing["endTimeMs"], candidate["endTimeMs"])
            overlap = max(0, overlap_end - overlap_start)
            if overlap == 0:
                continue

            existing_duration = existing["endTimeMs"] - existing["startTimeMs"]
            overlap_ratio = overlap / min(existing_duration, candidate_duration)
            if overlap_ratio < 0.6:
                continue

            existing_score = (existing["confidence"], -existing_duration)
            candidate_score = (candidate["confidence"], -candidate_duration)
            if candidate_score > existing_score:
                kept[idx] = candidate
            replaced = True
            break

        if not replaced:
            kept.append(candidate)
    return kept


def refine_candidates_with_transcript(
    candidates: list[dict[str, Any]], transcript: dict[str, Any]
) -> list[dict[str, Any]]:
    segment_map = {seg["segmentId"]: seg for seg in transcript["segments"]}
    refined: list[dict[str, Any]] = []

    for candidate in candidates:
        supporting_segment_ids = candidate.get("supportingSegmentIds") or []
        supporting_segments = [
            segment_map[segment_id]
            for segment_id in supporting_segment_ids
            if segment_id in segment_map
        ]

        if supporting_segments:
            candidate["startTimeMs"] = min(seg["startTimeMs"] for seg in supporting_segments)
            candidate["endTimeMs"] = max(seg["endTimeMs"] for seg in supporting_segments)

        duration = candidate["endTimeMs"] - candidate["startTimeMs"]
        if duration > ABSOLUTE_MAX_DURATION_MS:
            continue

        refined.append(candidate)

    return dedupe_overlapping_candidates(refined)


def detect_candidates(transcript: dict[str, Any], window_size: int, overlap: int) -> list[dict[str, Any]]:
    env = load_env_files(DEFAULT_ENV_FILES)
    client, model = create_client(env)
    chunks = chunk_segments(transcript["segments"], window_size=window_size, overlap=overlap)

    collected: list[dict[str, Any]] = []
    for chunk in chunks:
        collected.extend(detect_chunk_candidates(client, model, transcript, chunk))
    validated = validate_candidates_payload(collected)
    return refine_candidates_with_transcript(validated, transcript)


def main() -> int:
    parser = argparse.ArgumentParser(description="Detect highlight candidates from transcript JSON.")
    parser.add_argument("input", type=str, help="Path to transcript JSON")
    parser.add_argument("-o", "--output", type=str, default="", help="Output candidates JSON path")
    parser.add_argument("--window-size", type=int, default=DEFAULT_WINDOW_SIZE)
    parser.add_argument("--overlap", type=int, default=DEFAULT_OVERLAP)
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        return 1

    transcript = json.loads(input_path.read_text(encoding="utf-8"))
    try:
        candidates = detect_candidates(transcript, window_size=args.window_size, overlap=args.overlap)
    except Exception as exc:  # noqa: BLE001
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(candidates, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Saved candidates to: {output_path}")
    else:
        print(json.dumps(candidates, ensure_ascii=False, indent=2))

    print(f"Detected: {len(candidates)} candidates")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
