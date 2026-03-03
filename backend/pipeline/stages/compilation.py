"""Stage 5: Compilation — compile the generated Arduino code with retry and error resolution."""

import asyncio
import os
import re
import logging
import tempfile
from typing import Callable, Optional
from .base import BaseStage

import subprocess

logger = logging.getLogger(__name__)

MAX_COMPILE_ATTEMPTS = 5

# Board core auto-installation: FQBN prefix → (board manager URL, core name)
BOARD_CORES = {
    "esp32:esp32": (
        "https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json",
        "esp32:esp32",
    ),
    "esp8266:esp8266": (
        "https://arduino.esp8266.com/stable/package_esp8266com_index.json",
        "esp8266:esp8266",
    ),
    "STMicroelectronics:stm32": (
        "https://github.com/stm32duino/BoardManagerFiles/raw/main/package_stmicroelectronics_index.json",
        "STMicroelectronics:stm32",
    ),
    "stm32:stm32": (
        "https://github.com/stm32duino/BoardManagerFiles/raw/main/package_stmicroelectronics_index.json",
        "STMicroelectronics:stm32",
    ),
    "rp2040:rp2040": (
        "https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json",
        "rp2040:rp2040",
    ),
}


def ensure_board_core(arduino_cli_path: str, fqbn: str) -> None:
    """Check if the board core for the given FQBN is installed, install if not."""
    if not arduino_cli_path:
        return

    # arduino:avr is built-in, skip
    if fqbn.startswith("arduino:avr") or fqbn.startswith("arduino:sam"):
        # arduino:sam (Due) needs core install but no extra URL
        if fqbn.startswith("arduino:sam"):
            try:
                result = subprocess.run(
                    [arduino_cli_path, "core", "list", "--format", "json"],
                    capture_output=True, text=True, timeout=10,
                )
                if "arduino:sam" not in result.stdout:
                    logger.info("Installing arduino:sam core for Arduino Due...")
                    subprocess.run(
                        [arduino_cli_path, "core", "install", "arduino:sam"],
                        capture_output=True, text=True, timeout=300,
                    )
            except Exception as e:
                logger.warning(f"Failed to check/install arduino:sam: {e}")
        return

    # Find matching board core config
    board_url = None
    core_name = None
    for prefix, (url, name) in BOARD_CORES.items():
        if fqbn.startswith(prefix):
            board_url = url
            core_name = name
            break

    if not core_name:
        logger.info(f"No auto-install config for FQBN {fqbn}, skipping core check")
        return

    # Check if core is already installed
    try:
        result = subprocess.run(
            [arduino_cli_path, "core", "list", "--format", "json"],
            capture_output=True, text=True, timeout=10,
        )
        if core_name in result.stdout:
            logger.info(f"Board core {core_name} already installed")
            return
    except Exception:
        pass

    # Add board manager URL
    logger.info(f"Adding board manager URL for {core_name}...")
    try:
        subprocess.run(
            [arduino_cli_path, "config", "add", "board_manager.additional_urls", board_url],
            capture_output=True, text=True, timeout=10,
        )
    except Exception as e:
        logger.warning(f"Failed to add board URL: {e}")

    # Update index and install core
    logger.info(f"Installing board core {core_name} (this may take a few minutes)...")
    try:
        subprocess.run(
            [arduino_cli_path, "core", "update-index"],
            capture_output=True, text=True, timeout=120,
        )
        result = subprocess.run(
            [arduino_cli_path, "core", "install", core_name],
            capture_output=True, text=True, timeout=600,
        )
        if result.returncode == 0:
            logger.info(f"Board core {core_name} installed successfully")
        else:
            logger.warning(f"Core install failed: {result.stderr}")
    except Exception as e:
        logger.warning(f"Failed to install core {core_name}: {e}")


class CompilationStage(BaseStage):
    name = "Compilation"
    index = 5

    async def execute(self, context: dict, on_progress: Optional[Callable] = None) -> dict:
        from ...utils.code_generation import (
            compile_arduino_code, resolve_compilation_errors, install_missing_library,
        )

        task_config = context["task_config"]
        generated_code = context["generated_code"]
        matched_apis = context["matched_apis"]
        arduino_cli_path = self.app_config.arduino_cli_path
        fqbn = task_config.board_fqbn

        # Ensure board core is installed (ESP32, STM32, etc.)
        await asyncio.to_thread(ensure_board_core, arduino_cli_path, fqbn)

        # Create a temporary sketch directory
        sketch_dir = tempfile.mkdtemp(prefix="autoembed_sketch_")
        sketch_name = "sketch_jul22a"
        sketch_path = os.path.join(sketch_dir, sketch_name)
        os.makedirs(sketch_path, exist_ok=True)

        code_file = os.path.join(sketch_path, f"{sketch_name}.ino")
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(generated_code)

        logger.info(f"Sketch written to {code_file}")

        compiled = False
        current_code = generated_code
        component_str = ", ".join(task_config.components)
        pin_str = str(task_config.pin_connections)

        for attempt in range(1, MAX_COMPILE_ATTEMPTS + 1):
            logger.info(f"Compilation attempt {attempt}/{MAX_COMPILE_ATTEMPTS}")

            stdout, stderr, returncode = await asyncio.to_thread(
                compile_arduino_code, arduino_cli_path, sketch_path, fqbn
            )

            if returncode == 0:
                logger.info("Compilation successful!")
                compiled = True
                break

            logger.warning(f"Compilation failed (attempt {attempt}):\n{stderr}")

            # Check for missing library errors
            missing_lib_match = re.findall(
                r"No such file or directory.*?#include\s*[<\"](.+?)[>\"]", stderr
            )
            if missing_lib_match:
                for lib in missing_lib_match:
                    lib_name = lib.replace(".h", "")
                    logger.info(f"Attempting to install missing library: {lib_name}")
                    await asyncio.to_thread(
                        install_missing_library, arduino_cli_path, lib_name
                    )

            # Use LLM to resolve compilation errors
            if attempt < MAX_COMPILE_ATTEMPTS:
                llm_client = self._make_llm_client()
                await asyncio.to_thread(
                    resolve_compilation_errors,
                    llm_client, arduino_cli_path, sketch_path, fqbn,
                    component_str, task_config.board_name, pin_str,
                    task_config.task_description, matched_apis, stderr
                )
                # Re-read the corrected code (resolve_compilation_errors writes it)
                with open(code_file, "r", encoding="utf-8") as f:
                    current_code = f.read()

        if not compiled:
            raise RuntimeError(
                f"Compilation failed after {MAX_COMPILE_ATTEMPTS} attempts"
            )

        return {
            "compiled": True,
            "sketch_path": sketch_path,
            "compiled_code": current_code,
        }
