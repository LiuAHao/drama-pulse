#!/usr/bin/env python3
"""
DeepSeek secondary review for stage-1 highlight candidates.

Reads stage-1 candidates + transcript, reviews each candidate individually,
then writes final import-ready candidates after DeepSeek review filtering.

Usage:
    python review_highlights.py stage1_candidates.json --transcript transcript.json -o reviewed.json
    python review_highlights.py candidates.json -t transcript.json -o out.json --model deepseek-v4-pro
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

CONTEXT_BEFORE_COUNT = 5
CONTEXT_AFTER_COUNT = 5
SUPPORTING_CONTEXT_EXTRA = 2

HIGHLIGHT_TYPES = ["feel_good", "funny", "reversal", "conflict", "sweet"]
TEMPLATE_BY_TYPE = {
    "feel_good": "emotion_button",
    "funny": "emotion_button",
    "reversal": "emotion_button",
    "conflict": "vote_side",
    "sweet": "emotion_button",
}

VALID_DECISIONS = {"approve", "reject", "merge", "revise"}
def find_segment_range(
    segments: list[dict[str, Any]], start_ms: int, end_ms: int
) -> tuple[int, int]:
    """Find indices of segments that overlap with [start_ms, end_ms]."""
    start_idx = 0
    end_idx = len(segments)
    for i, seg in enumerate(segments):
        if seg["endTimeMs"] >= start_ms:
            start_idx = i
            break
    for i, seg in enumerate(segments):
        if seg["startTimeMs"] > end_ms:
            end_idx = i
            break
    return start_idx, end_idx


def format_segments(segments: list[dict[str, Any]]) -> str:
    if not segments:
        return "(无)"
    lines = []
    for seg in segments:
        lines.append(
            f"[{seg['segmentId']}|{seg['startTimeMs']}-{seg['endTimeMs']}] {seg['text']}"
        )
    return "\n".join(lines)


def format_approved_highlights(approved: list[dict[str, Any]]) -> str:
    if not approved:
        return "(尚无已批准高光)"
    lines = []
    for h in approved:
        lines.append(
            f"- [{h.get('highlightType', '?')}] {h.get('title', '?')} "
            f"({h.get('startTimeMs', 0)}-{h.get('endTimeMs', 0)})"
        )
    return "\n".join(lines)


def build_review_system_prompt() -> str:
    types_str = ", ".join(HIGHLIGHT_TYPES)
    mapping_str = json.dumps(TEMPLATE_BY_TYPE, ensure_ascii=False)
    return f"""你是 Drama Pulse 的高光复核助手。

你的任务不是重新找高光，而是对给定候选进行复核：
- 判断是否值得保留
- 修正开始时间和结束时间
- 去掉铺垫和冗余
- 避免和已通过高光重复
- 输出更适合客户端互动的窗口

可选决策只有：
- approve
- reject
- merge
- revise

可选高光类型只有：
{types_str}

固定模板映射：
{mapping_str}

复核原则：
1. 高光必须命中情绪峰值。
2. 可以删除无效铺垫，但“语义完整”优先于“极限压缩”。
3. 如果该候选不够成立，直接 reject。
4. interactionStartMs / interactionAppearMs / interactionEndMs 要考虑客户端组件持续存在窗口。
5. interactionStartMs 表示用户可重复点击的交互窗口开始；interactionAppearMs 表示组件真正出现时间，通常应略晚于 startTimeMs。
6. interactionAppearMs 优先落在观众已经看懂高光成立的时刻，通常比 startTimeMs 晚 300ms 到 1200ms，不要机械卡在字幕首字。
7. interactionEndMs 可以比 endTimeMs 略晚 1 到 2 秒，用于交互延续。
8. 不要放过长区间，不要保留明显重复候选。
9. 如果选择 merge，mergeTarget 说明应合并到哪个已批准高光或相邻候选。
10. 你必须专门复核 interactionOptions：检查它们是否贴合剧情立场、是否像真实观众会点击的一键弹幕、是否有网感和共鸣。
11. 删除书面化、过度理性、像旁白总结的话，例如“从长计议”“围观后续发展”“期待后续逆袭”这类表达。
12. 低强度高光（1-2）优先保留轻量浮窗弹幕式话术；高强度高光（4-5）优先保留强情绪、强站队、强爆发的话术。
13. interactionOptions 应短、准、带情绪，不要长句，不要解释剧情。
14. 不要把高光压缩成单个称呼、单个感叹词、单个字，或只有结果没有触发原因的残片。
15. 片段至少要能独立支撑 title 和 description；如果当前时间区间支撑不了文案，就扩时间，或者把文案改弱，不要硬保留夸张标题。
16. reversal 类型通常要保留“信息揭示/身份变化”与“关键反应”这两部分；funny 类型通常要保留“铺垫/吐槽”与“笑点落锤”；sweet 类型通常要保留“动作/照顾”与“被暖到的反馈”。
17. feel_good 类型通常要保留“压力或困局”到“转机/反杀/决心落点”的最短完整闭环；conflict 类型通常要保留“冲突挑起”与“站队爆发”的最短完整闭环。
18. 如果同一候选的前文里才出现真正触发点，而当前支撑字幕只剩反应词，不要继续压短，应回收触发句。
19. merge 只用于本质上同一情绪峰值的重复候选；如果是同一窗口内时间上明显分离的第二峰值，不要因为同类型就合并掉。
20. interactionStartMs 通常应等于 startTimeMs，最多只允许略晚，不要晚于 startTimeMs 超过 3 秒；如果只是想让按钮晚一点出现，请后移 interactionAppearMs，不要后移 interactionStartMs。
21. 你必须复核 intensity，不要机械沿用旧值，也不要默认写 3：
   - 1 = 轻微共鸣/轻吐槽
   - 2 = 明确情绪点，但仍是局部小波峰
   - 3 = 标准高光
   - 4 = 强情绪峰值，明显值得触发强互动
   - 5 = 本集最炸裂或最具代表性的极强峰值，极少使用
22. 如果时间区间被压短、语义强度下降，intensity 也应相应下调；如果补全后形成完整爆发闭环，可以上调。
23. 强度和客户端表现强绑定：
   - intensity < 3：客户端只会渲染轻量分组弹幕 / 云朵弹幕
   - intensity >= 3：客户端才会渲染正式交互组件
   所以如果这段不值得打断用户注意力，就不要给到 3 以上。

输出要求：
1. 只输出 JSON 数组，不要输出解释文字，不要使用 markdown 代码块。
2. 每个元素必须包含字段：
   candidateIndex, reviewDecision, approved, startTimeMs, endTimeMs, interactionStartMs, interactionAppearMs, interactionEndMs, highlightType, title, description, intensity, templateId, interactionOptions, reason, reviewReason, confidence
3. 可选字段：
   supportingSegmentIds, speakerGuess, targetCharacterGuess, mentionedCharacters, characterGuessConfidence, mergeTarget
4. reviewDecision 只能是: approve, reject, merge, revise
5. approved 为布尔值，reject 时为 false
6. interactionOptions 必须是 2 到 4 个简短中文短语，优先 4 到 8 个汉字。"""


def build_review_user_prompt(
    transcript: dict[str, Any],
    candidate: dict[str, Any],
    candidate_index: int,
    approved_highlights: list[dict[str, Any]],
) -> str:
    segments = transcript["segments"]
    seg_start_ms = candidate["startTimeMs"]
    seg_end_ms = candidate["endTimeMs"]

    # Find supporting segments
    supporting_ids = set(candidate.get("supportingSegmentIds") or [])
    supporting_segs = [s for s in segments if s["segmentId"] in supporting_ids]

    # If no supporting segments found, use time range
    if not supporting_segs:
        range_start, range_end = find_segment_range(segments, seg_start_ms, seg_end_ms)
        supporting_segs = segments[range_start:range_end]

    # Context before/after
    if supporting_segs:
        first_idx = segments.index(supporting_segs[0])
        last_idx = segments.index(supporting_segs[-1])
        ctx_before = segments[max(0, first_idx - CONTEXT_BEFORE_COUNT) : first_idx]
        ctx_after = segments[last_idx + 1 : min(len(segments), last_idx + 1 + CONTEXT_AFTER_COUNT)]
    else:
        ctx_before = []
        ctx_after = []

    parts = [
        f"剧集信息：",
        f"- dramaId: {transcript.get('dramaId', '')}",
        f"- episodeId: {transcript.get('episodeId', '')}",
        f"- episodeTitle: {transcript.get('episodeTitle', '')}",
        f"- episodeSummary: {transcript.get('episodeSummary', '')}",
        f"- mainGenre: {transcript.get('mainGenre', '')}",
        f"- characterRelationshipSummary: {transcript.get('characterRelationshipSummary', '')}",
        f"- episodeConflictSummary: {transcript.get('episodeConflictSummary', '')}",
        f"- audienceStanceHint: {transcript.get('audienceStanceHint', '')}",
        f"- toneHint: {transcript.get('toneHint', '')}",
        f"",
        f"已批准高光（防重复参考）：",
        format_approved_highlights(approved_highlights),
        f"",
        f"当前待复核候选：",
        json.dumps(candidate, ensure_ascii=False, indent=2),
        f"",
        f"候选核心支撑字幕：",
        format_segments(supporting_segs),
        f"",
        f"候选前文：",
        format_segments(ctx_before),
        f"",
        f"候选后文：",
        format_segments(ctx_after),
        f"",
        f"请对这条候选进行复核：",
        f"- 如果不值得保留，reject",
        f"- 如果值得保留但时间不准，revise",
        f"- 如果和其他候选重复，merge",
        f"- 如果已经足够准确，approve",
        f"- 请把 interactionOptions 改成更像观众会点的一键弹幕，避免太书面、太理性、太像策划文案。",
        f"- 请同时复核 intensity，确认它是 1-5 里的哪一级，不要默认写 3。",
        f"- 请保证最终时间区间能独立支撑 title / description，不要只剩一个字、一个称呼或一句失去上下文的反应词。",
    ]

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


def review_single_candidate(
    client: OpenAI,
    model: str,
    transcript: dict[str, Any],
    candidate: dict[str, Any],
    candidate_index: int,
    approved_highlights: list[dict[str, Any]],
) -> dict[str, Any] | None:
    system = build_review_system_prompt()
    user = build_review_user_prompt(transcript, candidate, candidate_index, approved_highlights)

    response = client.chat.completions.create(
        model=model,
        temperature=0.1,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    content = response.choices[0].message.content or "[]"
    results = extract_json_array(content)

    if not results:
        return None

    result = results[0]
    result["candidateIndex"] = candidate_index

    # Validate decision
    decision = result.get("reviewDecision", "").strip()
    if decision not in VALID_DECISIONS:
        result["reviewDecision"] = "revise"
        result["reviewReason"] = f"Invalid decision '{decision}', defaulted to revise"

    # Ensure approved flag is consistent
    if result["reviewDecision"] == "reject":
        result["approved"] = False
    else:
        result["approved"] = result.get("approved", True)

    # Enforce template mapping
    hl_type = result.get("highlightType", candidate.get("highlightType", ""))
    if hl_type in TEMPLATE_BY_TYPE:
        result["templateId"] = TEMPLATE_BY_TYPE[hl_type]

    # Ensure interaction times exist
    if "interactionStartMs" not in result:
        result["interactionStartMs"] = result.get("startTimeMs", candidate["startTimeMs"])
    if "interactionAppearMs" not in result:
        start_ms = result.get("startTimeMs", candidate["startTimeMs"])
        interaction_start_ms = result.get("interactionStartMs", start_ms)
        result["interactionAppearMs"] = max(interaction_start_ms, min(start_ms + 600, result.get("endTimeMs", candidate["endTimeMs"])))
    if "interactionEndMs" not in result:
        end_ms = result.get("endTimeMs", candidate["endTimeMs"])
        result["interactionEndMs"] = min(end_ms + 1500, result.get("endTimeMs", end_ms) + 3000)

    return result


def review_candidates(
    transcript: dict[str, Any],
    candidates: list[dict[str, Any]],
    model_override: str = "",
) -> list[dict[str, Any]]:
    env = load_env_files(DEFAULT_ENV_FILES)
    client, default_model = create_deepseek_client(
        env,
        purpose="highlight review",
        model_env_keys=("DEEPSEEK_HIGHLIGHT_REVIEW_MODEL",),
    )
    model = model_override or default_model

    reviewed: list[dict[str, Any]] = []
    approved_highlights: list[dict[str, Any]] = []

    for i, candidate in enumerate(candidates):
        print(f"  Reviewing candidate {i+1}/{len(candidates)}: {candidate.get('title', '?')}...")
        try:
            result = review_single_candidate(
                client, model, transcript, candidate, i, approved_highlights
            )
            if result is None:
                print(f"    -> Skipped (empty response)")
                continue

            # Propagate fields from original candidate that review doesn't output
            result.setdefault("episodeId", candidate.get("episodeId", ""))
            result.setdefault("intensity", candidate.get("intensity", 3))

            decision = result.get("reviewDecision", "?")
            approved = result.get("approved", False)
            print(f"    -> {decision} (approved={approved})")

            reviewed.append(result)

            # Track approved for dedup in subsequent reviews
            if approved and decision != "reject":
                approved_highlights.append({
                    "highlightType": result.get("highlightType", ""),
                    "title": result.get("title", ""),
                    "startTimeMs": result.get("startTimeMs", 0),
                    "endTimeMs": result.get("endTimeMs", 0),
                })
        except Exception as exc:
            print(f"    -> Error: {exc}", file=sys.stderr)

    return reviewed


def main() -> int:
    parser = argparse.ArgumentParser(
        description="DeepSeek secondary review for highlight candidates."
    )
    parser.add_argument("input", type=str, help="Path to stage-1 candidates JSON")
    parser.add_argument("-t", "--transcript", required=True, help="Path to transcript JSON")
    parser.add_argument("-o", "--output", type=str, default="", help="Output final candidate JSON path")
    parser.add_argument(
        "--save-reviewed",
        type=str,
        default="",
        help="Optional path to save raw reviewed results before final validation/filtering",
    )
    parser.add_argument("--story-context", type=str, default="", help="Optional story context JSON to merge before review")
    parser.add_argument("--model", type=str, default="", help="Override DeepSeek model name")
    args = parser.parse_args()

    input_path = Path(args.input)
    transcript_path = Path(args.transcript)

    if not input_path.exists():
        print(f"Error: Candidates file not found: {input_path}", file=sys.stderr)
        return 1
    if not transcript_path.exists():
        print(f"Error: Transcript file not found: {transcript_path}", file=sys.stderr)
        return 1

    candidates = json.loads(input_path.read_text(encoding="utf-8"))
    transcript = json.loads(transcript_path.read_text(encoding="utf-8"))
    if args.story_context:
        transcript = merge_transcript_with_story_context(
            transcript,
            load_story_context_file(args.story_context),
        )

    if not isinstance(candidates, list):
        print("Error: Candidates must be a JSON array", file=sys.stderr)
        return 1

    print(f"DeepSeek review: {len(candidates)} candidates")
    try:
        reviewed = review_candidates(transcript, candidates, model_override=args.model)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    # Summary
    decisions = {}
    for r in reviewed:
        d = r.get("reviewDecision", "unknown")
        decisions[d] = decisions.get(d, 0) + 1
    print(f"Review summary: {decisions}")

    final_candidates = validate_candidates_payload(reviewed, filter_reviewed=True)
    print(f"Final candidate count after validation/filtering: {len(final_candidates)}")

    if args.save_reviewed:
        reviewed_path = Path(args.save_reviewed)
        reviewed_path.parent.mkdir(parents=True, exist_ok=True)
        reviewed_path.write_text(json.dumps(reviewed, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Saved {len(reviewed)} raw reviewed candidates to: {reviewed_path}")

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(final_candidates, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Saved {len(final_candidates)} final candidates to: {output_path}")
    else:
        print(json.dumps(final_candidates, ensure_ascii=False, indent=2))

    print(f"DeepSeek review complete: reviewed={len(reviewed)}, final={len(final_candidates)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
