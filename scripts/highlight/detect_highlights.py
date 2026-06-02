#!/usr/bin/env python3
"""
DeepSeek stage-1 screening for Drama Pulse highlight candidates.

Reads a transcript JSON, splits into overlapping windows, calls DeepSeek
to identify high-recall highlight candidates.

Usage:
    python detect_highlights.py transcript.json -o stage1_candidates.json
    python detect_highlights.py transcript.json -o out.json --window-size 20 --overlap 4
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

from openai import OpenAI

from deepseek_client import DEFAULT_ENV_FILES, create_deepseek_client, load_env_files
from story_context_utils import load_story_context_file, merge_transcript_with_story_context
from validate_candidates import validate_candidates_payload

DEFAULT_WINDOW_SIZE = 24
DEFAULT_OVERLAP = 4
CONTEXT_SEGMENTS = 3
PREFERRED_MIN_DURATION_MS = 3000
PREFERRED_MAX_DURATION_MS = 12000
ABSOLUTE_MAX_DURATION_MS = 22000

HIGHLIGHT_TYPES = ["feel_good", "funny", "reversal", "conflict", "sweet"]
TEMPLATE_BY_TYPE = {
    "feel_good": "emotion_button",
    "funny": "emotion_button",
    "reversal": "emotion_button",
    "conflict": "vote_side",
    "sweet": "emotion_button",
}
def chunk_segments(
    segments: list[dict[str, Any]], window_size: int, overlap: int
) -> list[tuple[int, int]]:
    """Return list of (start_index, end_index) tuples for each window."""
    chunks: list[tuple[int, int]] = []
    start = 0
    step = max(1, window_size - overlap)
    while start < len(segments):
        end = min(start + window_size, len(segments))
        chunks.append((start, end))
        if end == len(segments):
            break
        start += step
    return chunks


def format_segments(segments: list[dict[str, Any]]) -> str:
    lines = []
    for seg in segments:
        lines.append(
            f"[{seg['segmentId']}|{seg['startTimeMs']}-{seg['endTimeMs']}] {seg['text']}"
        )
    return "\n".join(lines)


def build_detection_system_prompt() -> str:
    types_str = ", ".join(HIGHLIGHT_TYPES)
    mapping_str = json.dumps(TEMPLATE_BY_TYPE, ensure_ascii=False)
    return f"""你是 Drama Pulse 的短剧高光识别助手。

你的任务是从一小段带时间戳的短剧字幕中识别最值得触发互动的高光候选。

可选高光类型只有：
{types_str}

固定模板映射：
{mapping_str}

识别原则：
1. 优先识别情绪峰值，不要识别背景铺垫。
2. 单条高光尽量控制在 3 到 12 秒。
3. 优先使用 1 到 3 个连续 segment 组成高光。
4. 同一窗口通常输出 1 到 2 条；如果存在时间上明显分离、且类型不同或情绪功能不同的第二峰值，可放宽到 3 条。
5. conflict 类型优先抓争吵、翻脸、打骂、拒绝、站队。
6. feel_good 类型优先抓转机、反杀、发现希望、承诺落点。
7. funny 类型优先抓荒诞反差、嘴硬翻车、过度震惊、人物吐槽、自带弹幕感的好笑反应。
8. reversal 类型优先抓身份突变、信息反转、前后认知骤变、观众会本能喊“啊？”“卧槽”的转折瞬间。
9. sweet 类型优先抓保护、靠近、被暖到、关系软化、牺牲与照顾带来的温情落点。
10. 高光片段必须语义完整，不要只截单个称呼、单个感叹词或一个字；至少保留“触发句 + 关键反应”。
11. 如果窗口后半段出现明确生存转机、关系落点或喜剧爆点，不要只因为前面已经有强冲突就漏掉后面的第二峰值。
12. 不要输出与定义无关的类型。
13. startTimeMs / endTimeMs 必须来自给定 segment 的真实时间范围。
14. 如果没有明显高光，返回空数组 []。
15. supportingSegmentIds 请尽量填写，只列出真正支撑该高光的 segmentId。
16. 如果真正的高光只发生在大段中的后半句或某一句，可以压缩，但仍要保证语义完整。
17. 如果同一窗口中既有铺垫又有爆发，优先标爆发点，不要标铺垫段。
18. 请结合 episodeSummary、角色关系摘要和 mainGenre 理解人物立场，不要只根据单句台词机械判断。
19. interactionOptions 要像观众会点的一键弹幕，优先短、直接、有共鸣，避免书面化或过度理性表达。
20. 低强度高光（1-2）优先生成轻量吐槽/共鸣式选项；高强度高光（4-5）优先生成带站队、爆发、情绪宣泄感的选项。
21. intensity 必须认真区分，不要默认写 3：
   - 1 = 轻微共鸣/轻吐槽，不足以承载重组件
   - 2 = 明确有情绪点，但更像局部小波峰
   - 3 = 标准高光，适合常规按钮与组件触发
   - 4 = 强情绪峰值，观众明显想点、想喊、想站队
   - 5 = 本集最炸裂或最标志性的极强峰值，应非常克制使用
22. 只有当该片段明显强于一般高光时才给 4-5；轻微温情、短促吐槽、信息不完整的片段不要给高分。
23. 强度和客户端表现要对应：
   - intensity < 3：只会走轻量分组弹幕 / 云朵弹幕，不会上中心交互组件
   - intensity >= 3：才会走正式交互组件
   因此不要把只适合轻量飘过的片段误标成 3 以上。

输出要求：
1. 只输出 JSON 数组，不要输出解释文字，不要使用 markdown 代码块。
2. 每个元素必须包含字段：
   episodeId, startTimeMs, endTimeMs, highlightType, title, description, intensity, templateId, interactionOptions, reason, confidence
3. 可选字段：
   supportingSegmentIds, speakerGuess, targetCharacterGuess, mentionedCharacters, characterGuessConfidence
4. interactionOptions 必须是 2 到 4 个简短中文短语，优先 4 到 8 个汉字，适合一键发送。
5. confidence 为 0 到 1 浮点数。
6. intensity 为 1 到 5 整数。"""


def build_detection_user_prompt(
    transcript: dict[str, Any],
    main_chunk: list[dict[str, Any]],
    prev_context: list[dict[str, Any]],
    next_context: list[dict[str, Any]],
) -> str:
    drama_id = transcript.get("dramaId", "")
    episode_id = transcript.get("episodeId", "")
    episode_title = transcript.get("episodeTitle", "")
    episode_summary = transcript.get("episodeSummary", "")
    main_genre = transcript.get("mainGenre", "")
    character_relationship_summary = transcript.get("characterRelationshipSummary", "")
    episode_conflict_summary = transcript.get("episodeConflictSummary", "")
    audience_stance_hint = transcript.get("audienceStanceHint", "")
    tone_hint = transcript.get("toneHint", "")

    chunk_start = main_chunk[0]["startTimeMs"] if main_chunk else 0
    chunk_end = main_chunk[-1]["endTimeMs"] if main_chunk else 0

    parts = [
        f"剧集信息：",
        f"- dramaId: {drama_id}",
        f"- episodeId: {episode_id}",
        f"- episodeTitle: {episode_title}",
        f"- episodeSummary: {episode_summary}",
        f"- mainGenre: {main_genre}",
        f"- characterRelationshipSummary: {character_relationship_summary}",
        f"- episodeConflictSummary: {episode_conflict_summary}",
        f"- audienceStanceHint: {audience_stance_hint}",
        f"- toneHint: {tone_hint}",
        f"",
        f"当前识别窗口：",
        f"- chunkStartMs: {chunk_start}",
        f"- chunkEndMs: {chunk_end}",
    ]

    if prev_context:
        parts.append(f"\n窗口前文：")
        parts.append(format_segments(prev_context))

    parts.append(f"\n核心识别片段：")
    parts.append(format_segments(main_chunk))

    if next_context:
        parts.append(f"\n窗口后文：")
        parts.append(format_segments(next_context))

    parts.append(f"\n请识别这个窗口里最值得打标的高光候选。")
    parts.append(f"如果只有背景说明，没有明确情绪峰值，请返回 []。")
    parts.append("请特别注意：互动选项要像观众会顺手点的一键弹幕，避免“从长计议”“围观后续发展”这类偏书面或过于理性的表达。")

    return "\n".join(parts)


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


def detect_chunk(
    client: OpenAI,
    model: str,
    transcript: dict[str, Any],
    all_segments: list[dict[str, Any]],
    start_idx: int,
    end_idx: int,
) -> list[dict[str, Any]]:
    main_chunk = all_segments[start_idx:end_idx]
    prev_start = max(0, start_idx - CONTEXT_SEGMENTS)
    next_end = min(len(all_segments), end_idx + CONTEXT_SEGMENTS)
    prev_context = all_segments[prev_start:start_idx]
    next_context = all_segments[end_idx:next_end]

    system = build_detection_system_prompt()
    user = build_detection_user_prompt(transcript, main_chunk, prev_context, next_context)

    response = client.chat.completions.create(
        model=model,
        temperature=0.1,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
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


def refine_candidates(
    candidates: list[dict[str, Any]], transcript: dict[str, Any]
) -> list[dict[str, Any]]:
    segment_map = {seg["segmentId"]: seg for seg in transcript["segments"]}
    refined: list[dict[str, Any]] = []

    for candidate in candidates:
        supporting_ids = candidate.get("supportingSegmentIds") or []
        supporting_segments = [
            segment_map[sid] for sid in supporting_ids if sid in segment_map
        ]

        if supporting_segments:
            candidate["startTimeMs"] = min(s["startTimeMs"] for s in supporting_segments)
            candidate["endTimeMs"] = max(s["endTimeMs"] for s in supporting_segments)

        duration = candidate["endTimeMs"] - candidate["startTimeMs"]
        if duration > ABSOLUTE_MAX_DURATION_MS:
            continue

        refined.append(candidate)

    return dedupe_overlapping_candidates(refined)


def detect_candidates(
    transcript: dict[str, Any], window_size: int, overlap: int
) -> list[dict[str, Any]]:
    env = load_env_files(DEFAULT_ENV_FILES)
    client, model = create_deepseek_client(
        env,
        purpose="highlight stage-1 screening",
        model_env_keys=("DEEPSEEK_HIGHLIGHT_DETECT_MODEL",),
    )

    all_segments = transcript["segments"]
    windows = chunk_segments(all_segments, window_size=window_size, overlap=overlap)

    collected: list[dict[str, Any]] = []
    for i, (start_idx, end_idx) in enumerate(windows):
        print(f"  Processing window {i+1}/{len(windows)} (segments {start_idx}-{end_idx})...")
        try:
            results = detect_chunk(client, model, transcript, all_segments, start_idx, end_idx)
            collected.extend(results)
        except Exception as exc:
            print(f"  Warning: window {i+1} failed: {exc}", file=sys.stderr)

    if not collected:
        return []

    validated = validate_candidates_payload(collected)
    return refine_candidates(validated, transcript)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="DeepSeek stage-1 screening for highlight candidates."
    )
    parser.add_argument("input", type=str, help="Path to transcript JSON")
    parser.add_argument("-o", "--output", type=str, default="", help="Output candidates JSON path")
    parser.add_argument("--window-size", type=int, default=DEFAULT_WINDOW_SIZE)
    parser.add_argument("--overlap", type=int, default=DEFAULT_OVERLAP)
    parser.add_argument("--story-context", type=str, default="", help="Optional story context JSON to merge before screening")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        return 1

    transcript = json.loads(input_path.read_text(encoding="utf-8"))
    if args.story_context:
        transcript = merge_transcript_with_story_context(
            transcript,
            load_story_context_file(args.story_context),
        )
    if "segments" not in transcript:
        print("Error: transcript JSON missing 'segments' field", file=sys.stderr)
        return 1

    print(
        f"DeepSeek stage-1 screening: {len(transcript['segments'])} segments, "
        f"window={args.window_size}, overlap={args.overlap}"
    )
    try:
        candidates = detect_candidates(transcript, window_size=args.window_size, overlap=args.overlap)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(candidates, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Saved {len(candidates)} DeepSeek stage-1 candidates to: {output_path}")
    else:
        print(json.dumps(candidates, ensure_ascii=False, indent=2))

    print(f"DeepSeek stage-1 screening complete: {len(candidates)} candidates")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
