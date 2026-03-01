"""Stage 6: Upload — upload the compiled sketch to the Arduino board."""

import asyncio
import subprocess
import logging
from .base import BaseStage

logger = logging.getLogger(__name__)

MAX_UPLOAD_ATTEMPTS = 3


class UploadStage(BaseStage):
    name = "Upload"
    index = 6

    async def execute(self, context: dict) -> dict:
        task_config = context["task_config"]
        sketch_path = context["sketch_path"]
        arduino_cli_path = self.app_config.arduino_cli_path
        serial_port = self.app_config.serial_port
        fqbn = task_config.board_fqbn

        if not serial_port:
            raise RuntimeError(
                "Serial port not configured. Set serial_port in app settings."
            )

        uploaded = False

        for attempt in range(1, MAX_UPLOAD_ATTEMPTS + 1):
            logger.info(f"Upload attempt {attempt}/{MAX_UPLOAD_ATTEMPTS} to {serial_port}")

            result = await asyncio.to_thread(
                subprocess.run,
                [
                    arduino_cli_path, "upload",
                    "--fqbn", fqbn,
                    "--port", serial_port,
                    sketch_path,
                ],
                capture_output=True, text=True, encoding="utf-8",
            )

            if result.returncode == 0:
                logger.info("Upload successful!")
                uploaded = True
                break

            logger.warning(f"Upload failed (attempt {attempt}):\n{result.stderr}")

            if attempt < MAX_UPLOAD_ATTEMPTS:
                # Brief pause before retry to allow port recovery
                await asyncio.sleep(2)

        if not uploaded:
            raise RuntimeError(
                f"Upload failed after {MAX_UPLOAD_ATTEMPTS} attempts: {result.stderr}"
            )

        return {
            "uploaded": True,
        }
