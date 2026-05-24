#!/usr/bin/env python3
"""
Extract audio from mp4 video file using ffmpeg.

Usage:
    python extract_audio.py input.mp4 -o output.mp3
    python extract_audio.py input.mp4 --format wav
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


SUPPORTED_FORMATS = {"mp3", "wav", "flac", "m4a"}
FORMAT_OPTIONS = {
    "mp3": ["-ac", "1", "-ar", "16000", "-acodec", "libmp3lame", "-b:a", "128k"],
    "wav": ["-ac", "1", "-ar", "16000", "-acodec", "pcm_s16le"],
    "flac": ["-ac", "1", "-ar", "16000", "-acodec", "flac"],
    "m4a": ["-ac", "1", "-ar", "16000", "-acodec", "aac", "-b:a", "128k"],
}


def extract_audio(video_path: Path, output_path: Path, audio_format: str = "mp3") -> Path:
    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    if audio_format not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported format: {audio_format}. Use one of {SUPPORTED_FORMATS}")

    if output_path.suffix == "":
        output_path = output_path.with_suffix(f".{audio_format}")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-i", str(video_path),
        "-vn",
        *FORMAT_OPTIONS[audio_format],
        "-y",
        str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\n{result.stderr}")

    return output_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract audio from video file.")
    parser.add_argument("video", type=str, help="Path to the video file")
    parser.add_argument("-o", "--output", type=str, default="", help="Output audio path")
    parser.add_argument("--format", type=str, default="mp3", choices=sorted(SUPPORTED_FORMATS))
    args = parser.parse_args()

    video_path = Path(args.video)
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = video_path.with_suffix(f".{args.format}")

    try:
        result = extract_audio(video_path, output_path, args.format)
        print(f"Audio extracted to: {result}")
        return 0
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
