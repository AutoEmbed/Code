"""Stage 5: Compilation — compile the generated Arduino code with retry and error resolution."""

import asyncio
import os
import re
import logging
import tempfile
from .base import BaseStage

logger = logging.getLogger(__name__)

MAX_COMPILE_ATTEMPTS = 5


class CompilationStage(BaseStage):
    name = "Compilation"
    index = 5

    async def execute(self, context: dict) -> dict:
        from ...utils.code_generation import (
            compile_arduino_code, resolve_compilation_errors, install_missing_library,
        )

        task_config = context["task_config"]
        generated_code = context["generated_code"]
        matched_apis = context["matched_apis"]
        arduino_cli_path = self.app_config.arduino_cli_path
        fqbn = task_config.board_fqbn

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
