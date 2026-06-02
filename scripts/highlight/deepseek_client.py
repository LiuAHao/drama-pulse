from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from openai import OpenAI


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ENV_FILES = [REPO_ROOT / ".env", REPO_ROOT / "server" / ".env"]


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


def create_deepseek_client(
    env: dict[str, str],
    *,
    purpose: str,
    model_env_keys: Iterable[str] = (),
    default_model: str = "deepseek-v4-pro",
) -> tuple[OpenAI, str]:
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
