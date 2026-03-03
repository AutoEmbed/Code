"""Settings API routes — serial ports, arduino-cli validation, presets."""

import asyncio
import json
import os
import subprocess
import logging
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/settings")


class TestAPIRequest(BaseModel):
    api_key: str
    api_base_url: str
    model: str


@router.get("/serial-ports")
def list_serial_ports():
    """List available serial ports with descriptions."""
    try:
        from serial.tools.list_ports import comports
        return [{"port": p.device, "desc": p.description} for p in comports()]
    except Exception as e:
        logger.error(f"Failed to list serial ports: {e}")
        return []


@router.post("/validate-arduino-cli")
async def validate_arduino_cli(data: dict):
    """Validate that the given arduino-cli path is a working executable."""
    path = data.get("arduino_cli_path", "")
    try:
        result = subprocess.run(
            [path, "version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            return {"valid": True, "version": result.stdout.strip()}
        return {"valid": False, "error": result.stderr}
    except Exception as e:
        return {"valid": False, "error": str(e)}


@router.get("/presets")
def get_presets():
    """Return the example tasks / presets JSON."""
    presets_path = os.path.join(
        os.path.dirname(__file__), "..", "data", "Example_tasks.json"
    )
    try:
        with open(presets_path, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load presets: {e}")
        return {}


@router.post("/test-api")
async def test_api(req: TestAPIRequest):
    """Test LLM API connectivity with a trivial request."""
    try:
        from ..utils.llm_client import LLMClient

        client = LLMClient(
            api_key=req.api_key, api_base_url=req.api_base_url, model=req.model
        )
        resp = await asyncio.to_thread(
            client.send_request, "Reply with OK", max_retries=1, timeout=30
        )
        return {"ok": True, "response": resp[:100] if resp else ""}
    except Exception as e:
        return {"ok": False, "error": str(e)[:300]}
