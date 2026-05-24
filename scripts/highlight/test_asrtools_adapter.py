#!/usr/bin/env python3
"""
最小 AsrTools 适配验证脚本。

用途：
1. 调用本地 AsrTools 的某个 ASR backend
2. 输出原始返回结构摘要
3. 输出 AsrTools 标准化后的 segments 摘要
4. 输出 Drama Pulse 内部 transcript JSON 示例

说明：
- 当前默认使用 BcutASR，因为在本地验证中它能返回结构化 utterances。
- 该脚本是“接入验证”和“格式评估”工具，不直接写库。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ASRTOOLS_ROOT = Path("/Users/a0000/Desktop/项目文件/开源项目/AsrTools")
DEFAULT_AUDIO_FILE = DEFAULT_ASRTOOLS_ROOT / "resources" / "test.mp3"


def _load_backend(asrtools_root: Path, backend: str):
    sys.path.insert(0, str(asrtools_root))

    if backend == "bcut":
        from bk_asr import BcutASR

        return BcutASR
    if backend == "kuaishou":
        from bk_asr import KuaiShouASR

        return KuaiShouASR
    if backend == "jianying":
        from bk_asr import JianYingASR

        return JianYingASR

    raise ValueError(f"Unsupported backend: {backend}")


def summarize_raw_response(raw: Any) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "pythonType": type(raw).__name__,
        "topLevelKeys": list(raw.keys()) if isinstance(raw, dict) else None,
    }

    if not isinstance(raw, dict):
        return summary

    if "utterances" in raw and isinstance(raw["utterances"], list):
        utterances = raw["utterances"]
        summary["shape"] = "utterances"
        summary["utteranceCount"] = len(utterances)
        summary["firstUtterance"] = utterances[0] if utterances else None
    elif "data" in raw:
        summary["shape"] = "data"
        summary["dataType"] = type(raw["data"]).__name__
        if isinstance(raw["data"], dict):
            summary["dataKeys"] = list(raw["data"].keys())
        elif isinstance(raw["data"], list):
            summary["dataLength"] = len(raw["data"])
        summary["message"] = raw.get("msg")
        summary["code"] = raw.get("code")
    else:
        summary["shape"] = "unknown"

    return summary


def normalize_to_transcript(drama_id: str, episode_id: str, asr_data: Any, source: str) -> dict[str, Any]:
    segments = []
    for index, seg in enumerate(asr_data, start=1):
        segments.append(
            {
                "segmentId": f"seg_{index:04d}",
                "startTimeMs": int(seg.start_time),
                "endTimeMs": int(seg.end_time),
                "text": seg.text,
            }
        )

    return {
        "dramaId": drama_id,
        "episodeId": episode_id,
        "source": source,
        "language": "zh",
        "segments": segments,
    }


def build_segments_from_raw(backend: Any, raw: Any) -> list[Any]:
    if not isinstance(raw, dict):
        raise ValueError("Raw response is not a dict, cannot normalize.")
    return backend._make_segments(raw)


def main() -> int:
    parser = argparse.ArgumentParser(description="Test AsrTools adapter output for Drama Pulse.")
    parser.add_argument("--backend", default="bcut", choices=["bcut", "kuaishou", "jianying"])
    parser.add_argument("--asrtools-root", default=str(DEFAULT_ASRTOOLS_ROOT))
    parser.add_argument("--audio-file", default=str(DEFAULT_AUDIO_FILE))
    parser.add_argument("--drama-id", default="drama_demo")
    parser.add_argument("--episode-id", default="episode_demo")
    parser.add_argument("--save-json", default="")
    args = parser.parse_args()

    asrtools_root = Path(args.asrtools_root)
    audio_file = Path(args.audio_file)

    if not asrtools_root.exists():
        raise FileNotFoundError(f"AsrTools root not found: {asrtools_root}")
    if not audio_file.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_file}")

    backend_cls = _load_backend(asrtools_root, args.backend)
    backend = backend_cls(str(audio_file), use_cache=False)

    print("=== STEP 1: RAW RESPONSE ===")
    raw = backend._run()
    print(json.dumps(summarize_raw_response(raw), ensure_ascii=False, indent=2))

    print("\n=== STEP 2: NORMALIZED ASR SEGMENTS ===")
    try:
        asr_data = build_segments_from_raw(backend, raw)
    except Exception as exc:  # noqa: BLE001 - this is a test/inspection script
        print(
            json.dumps(
                {
                    "normalizationOk": False,
                    "errorType": type(exc).__name__,
                    "error": str(exc),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 1
    normalized_summary = {
        "segmentCount": len(asr_data),
        "firstThreeSegments": [
            {
                "text": seg.text,
                "startTimeMs": int(seg.start_time),
                "endTimeMs": int(seg.end_time),
            }
            for seg in list(asr_data)[:3]
        ],
    }
    print(json.dumps(normalized_summary, ensure_ascii=False, indent=2))

    print("\n=== STEP 3: DRAMA PULSE TRANSCRIPT JSON SAMPLE ===")
    transcript = normalize_to_transcript(
        drama_id=args.drama_id,
        episode_id=args.episode_id,
        asr_data=asr_data,
        source=f"asrtools_{args.backend}",
    )
    sample = {
        **{k: v for k, v in transcript.items() if k != "segments"},
        "segmentCount": len(transcript["segments"]),
        "firstThreeSegments": transcript["segments"][:3],
    }
    print(json.dumps(sample, ensure_ascii=False, indent=2))

    if args.save_json:
        save_path = Path(args.save_json)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        save_path.write_text(json.dumps(transcript, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nSaved transcript JSON to: {save_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
