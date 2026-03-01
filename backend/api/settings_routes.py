"""Settings API routes — serial ports, arduino-cli validation, presets."""

import json
import os
import subprocess
import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/settings")


@router.get("/serial-ports")
def list_serial_ports():
    """List available serial ports on the system."""
    try:
        import serial.tools.list_ports
        ports = serial.tools.list_ports.comports()
        return [{"device": p.device, "description": p.description} for p in ports]
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
