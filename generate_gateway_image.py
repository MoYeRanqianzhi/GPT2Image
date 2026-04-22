#!/usr/bin/env python3
"""
Generate an image through the Responses-compatible gateway configured for Codex.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import ssl

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover
    import tomli as tomllib  # type: ignore


DEFAULT_MODEL = "gpt-5.4"
DEFAULT_TIMEOUT = 600
DEFAULT_SIZE = "1024x1024"


def load_config() -> tuple[str, str]:
    config_path = Path.home() / ".codex" / "config.toml"
    auth_path = Path.home() / ".codex" / "auth.json"

    if not config_path.exists():
        raise RuntimeError(f"Missing config file: {config_path}")
    if not auth_path.exists():
        raise RuntimeError(f"Missing auth file: {auth_path}")

    config = tomllib.loads(config_path.read_text(encoding="utf-8"))
    base_url = (
        config.get("model_providers", {})
        .get(config.get("model_provider", ""), {})
        .get("base_url")
    )
    if not base_url:
        raise RuntimeError("Could not find model provider base_url in ~/.codex/config.toml")

    auth = json.loads(auth_path.read_text(encoding="utf-8"))
    api_key = auth.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Could not find OPENAI_API_KEY in ~/.codex/auth.json")

    return str(base_url).rstrip("/"), str(api_key)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate an image via the configured Responses gateway.")
    parser.add_argument("--prompt", required=True, help="Image generation prompt.")
    parser.add_argument("--out", required=True, help="Output image path.")
    parser.add_argument("--size", default=DEFAULT_SIZE, help="Image size, e.g. 1024x1024 or 1024x1536.")
    parser.add_argument(
        "--action",
        choices=("auto", "generate", "edit"),
        default="auto",
        help="Image tool action. Use edit when providing a reference image or mask.",
    )
    parser.add_argument(
        "--image",
        action="append",
        default=[],
        help="Reference image path. Repeat the flag to include multiple images.",
    )
    parser.add_argument(
        "--image-url",
        action="append",
        default=[],
        help="Reference image URL. Repeat the flag to include multiple images.",
    )
    parser.add_argument(
        "--mask",
        help="Optional mask image path for edit workflows.",
    )
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Responses model to call.")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT, help="HTTP timeout in seconds.")
    return parser.parse_args()


def encode_image_data_url(image_path: str) -> str:
    path = Path(image_path).expanduser().resolve()
    if not path.exists():
        raise RuntimeError(f"Image file does not exist: {path}")

    mime_type, _ = mimetypes.guess_type(path.name)
    if not mime_type:
        mime_type = "application/octet-stream"

    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def build_payload(args: argparse.Namespace) -> bytes:
    input_content: list[dict[str, str]] = [
        {
            "type": "input_text",
            "text": args.prompt,
        }
    ]

    for image_path in args.image:
        input_content.append(
            {
                "type": "input_image",
                "image_url": encode_image_data_url(image_path),
            }
        )

    for image_url in args.image_url:
        input_content.append(
            {
                "type": "input_image",
                "image_url": image_url,
            }
        )

    if args.mask:
        input_content.append(
            {
                "type": "input_image_mask",
                "image_url": encode_image_data_url(args.mask),
            }
        )

    payload = {
        "model": args.model,
        "input": [
            {
                "role": "user",
                "content": input_content,
            }
        ],
        "tools": [
            {
                "type": "image_generation",
                "size": args.size,
                "action": args.action,
            }
        ],
    }
    return json.dumps(payload, ensure_ascii=False).encode("utf-8")


def extract_image_base64(data: dict) -> str:
    for item in data.get("output", []):
        if item.get("type") == "image_generation_call" and item.get("result"):
            return item["result"]
    raise RuntimeError("No image_generation_call result returned")


def main() -> int:
    args = parse_args()

    try:
        base_url, api_key = load_config()
        body = build_payload(args)
        request = Request(
            f"{base_url}/responses",
            data=body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        ctx = ssl.create_default_context()
        ctx.set_ciphers('DEFAULT:@SECLEVEL=1')

        with urlopen(request, context=ctx, timeout=args.timeout) as response:
            data = json.loads(response.read().decode("utf-8", errors="replace"))

        image_base64 = extract_image_base64(data)
        output_path = Path(args.out).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(base64.b64decode(image_base64))
        print(json.dumps({"saved": str(output_path), "bytes": output_path.stat().st_size}, ensure_ascii=False))
        return 0
    except HTTPError as exc:
        message = exc.read().decode("utf-8", errors="replace")
        print(
            json.dumps(
                {
                    "error": "http_error",
                    "status": exc.code,
                    "body": message,
                },
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        return 1
    except URLError as exc:
        print(json.dumps({"error": "network_error", "message": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1
    except TimeoutError as exc:
        print(json.dumps({"error": "timeout", "message": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1
    except Exception as exc:
        print(json.dumps({"error": "runtime_error", "message": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
