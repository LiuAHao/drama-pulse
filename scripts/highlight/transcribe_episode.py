#!/usr/bin/env python3
"""
Transcribe an audio file using AsrTools (BcutASR by default).

Outputs raw ASR result JSON that can be fed into normalize_transcript.py.

Usage:
    python transcribe_episode.py audio.mp3 -o raw_asr.json
    python transcribe_episode.py audio.mp3 --backend bcut --asrtools-root /path/to/AsrTools
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

DEFAULT_ASRTOOLS_ROOT = Path("/Users/a0000/Desktop/项目文件/开源项目/AsrTools")
BACKENDS = ["bcut"]


def load_backend(asrtools_root: Path, backend: str):
    sys.path.insert(0, str(asrtools_root))
    if backend == "bcut":
        from bk_asr import BcutASR
        return BcutASR
    raise ValueError(f"Unsupported backend: {backend}")


def run_asr(audio_path: Path, backend_name: str, asrtools_root: Path) -> dict[str, Any]:
    backend_cls = load_backend(asrtools_root, backend_name)
    asr = backend_cls(str(audio_path), use_cache=False)
    asr_data = asr.run()

    segments = []
    for seg in asr_data:
        segments.append({
            "text": seg.text,
            "start_time": int(seg.start_time),
            "end_time": int(seg.end_time),
        })

    return {
        "backend": backend_name,
        "audio_file": str(audio_path),
        "segment_count": len(segments),
        "segments": segments,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Transcribe audio using AsrTools.")
    parser.add_argument("audio", type=str, help="Path to the audio file")
    parser.add_argument("-o", "--output", type=str, default="", help="Output JSON path")
    parser.add_argument("--backend", type=str, default="bcut", choices=BACKENDS)
    parser.add_argument("--asrtools-root", type=str, default=str(DEFAULT_ASRTOOLS_ROOT))
    args = parser.parse_args()

    audio_path = Path(args.audio)
    asrtools_root = Path(args.asrtools_root)

    if not audio_path.exists():
        print(f"Error: Audio file not found: {audio_path}", file=sys.stderr)
        return 1
    if not asrtools_root.exists():
        print(f"Error: AsrTools root not found: {asrtools_root}", file=sys.stderr)
        return 1

    try:
        result = run_asr(audio_path, args.backend, asrtools_root)
    except Exception as exc:
        print(f"Error during transcription: {exc}", file=sys.stderr)
        return 1

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Saved raw ASR result to: {output_path}")
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))

    print(f"Transcription complete: {result['segment_count']} segments")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
