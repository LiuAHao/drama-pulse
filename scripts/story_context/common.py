from __future__ import annotations

import json
import os
import re
from collections.abc import Iterable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openai import OpenAI


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
DEFAULT_OUTPUT_ROOT = REPO_ROOT / "artifacts" / "story_context"
DEFAULT_ENV_FILES = [REPO_ROOT / ".env", REPO_ROOT / "server" / ".env"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: str | Path) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path: str | Path, payload: Any) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def guess_episode_no(episode_id: str) -> int:
    matches = re.findall(r"(\d+)", episode_id)
    return int(matches[-1]) if matches else 0


def sort_episode_ids(episode_ids: Iterable[str]) -> list[str]:
    return sorted(set(episode_ids), key=lambda episode_id: (guess_episode_no(episode_id), episode_id))


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


def create_llm_client(
    *,
    purpose: str,
    model_env_keys: Iterable[str] = (),
    default_model: str = "deepseek-v4-pro",
) -> tuple[OpenAI, str]:
    env = load_env_files(DEFAULT_ENV_FILES)
    api_key = (
        os.getenv("DEEPSEEK_API_KEY")
        or env.get("DEEPSEEK_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or env.get("OPENAI_API_KEY")
    )
    if not api_key:
        raise RuntimeError(f"Missing DEEPSEEK_API_KEY / OPENAI_API_KEY for {purpose}")

    base_url = os.getenv("DEEPSEEK_BASE_URL") or env.get("DEEPSEEK_BASE_URL")
    if not base_url:
        endpoint = os.getenv("DEEPSEEK_ENDPOINT") or env.get("DEEPSEEK_ENDPOINT")
        if endpoint and endpoint.startswith(("http://", "https://")):
            base_url = endpoint
    if not base_url:
        base_url = "https://api.deepseek.com/v1"
    elif base_url.rstrip("/") == "https://api.deepseek.com":
        base_url = "https://api.deepseek.com/v1"

    model = ""
    for key in [*model_env_keys, "DEEPSEEK_MODEL"]:
        model = os.getenv(key) or env.get(key) or ""
        if model:
            break
    if not model:
        model = default_model

    return OpenAI(api_key=api_key, base_url=base_url), model


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
        parsed = json.loads(content[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("model output is not a JSON object")
    return parsed


def build_output_paths(output_root: Path, drama_id: str) -> dict[str, Path]:
    base_dir = output_root / drama_id
    return {
        "base": base_dir,
        "transcripts": base_dir / "transcripts",
        "episode_summaries": base_dir / "episode_summaries",
        "timeline": base_dir / "timeline",
        "series": base_dir / "series",
        "tail": base_dir / "tail",
        "package": base_dir / "package",
        "manifest": base_dir / "manifest.json",
    }


def load_manifest(manifest_path: Path, drama_id: str) -> dict[str, Any]:
    if manifest_path.exists():
        return read_json(manifest_path)
    return {
        "dramaId": drama_id,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
        "status": "pending",
        "stages": {
            "transcript": {"status": "pending", "updatedAt": ""},
            "episode_summary": {"status": "pending", "updatedAt": ""},
            "event_timeline": {"status": "pending", "updatedAt": ""},
            "series_overview": {"status": "pending", "updatedAt": ""},
            "tail_snapshot": {"status": "pending", "updatedAt": ""},
            "story_context_package": {"status": "pending", "updatedAt": ""},
        },
        "episodes": {},
        "artifacts": {},
    }


def update_manifest_stage(
    manifest_path: Path,
    drama_id: str,
    stage: str,
    *,
    status: str,
    artifacts: dict[str, str] | None = None,
    episode_updates: dict[str, dict[str, str]] | None = None,
) -> dict[str, Any]:
    manifest = load_manifest(manifest_path, drama_id)
    timestamp = now_iso()
    manifest["updatedAt"] = timestamp
    manifest["status"] = status if stage == "story_context_package" else "running"
    manifest["stages"].setdefault(stage, {})
    manifest["stages"][stage]["status"] = status
    manifest["stages"][stage]["updatedAt"] = timestamp
    if artifacts:
        manifest["artifacts"].update(artifacts)
    if episode_updates:
        for episode_id, payload in episode_updates.items():
            manifest["episodes"].setdefault(episode_id, {})
            manifest["episodes"][episode_id].update(payload)
    if stage == "story_context_package" and status == "completed":
        manifest["status"] = "completed"
    write_json(manifest_path, manifest)
    return manifest


def shorten_text(text: str, *, limit: int = 60) -> str:
    compact = " ".join(text.split())
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit].rstrip()}..."


def pick_segment_texts(segments: list[dict[str, Any]], count: int = 3) -> list[str]:
    if not segments:
        return []
    if len(segments) <= count:
        return [seg.get("text", "").strip() for seg in segments if seg.get("text", "").strip()]

    indices = sorted({
        0,
        len(segments) // 2,
        len(segments) - 1,
    })
    texts = [segments[index].get("text", "").strip() for index in indices]
    return [text for text in texts if text]
