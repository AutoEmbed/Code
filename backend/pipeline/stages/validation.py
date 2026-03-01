"""Stage 7: Validation — read serial output and validate against expected behavior."""

import asyncio
import logging
from .base import BaseStage

logger = logging.getLogger(__name__)


class ValidationStage(BaseStage):
    name = "Validation"
    index = 7

    async def execute(self, context: dict) -> dict:
        from ...utils.code_generation import read_serial_output
        from ...utils.gpt_processing import (
            validate_debug_output_with_gpt, clean_code_of_debug_info,
        )
        from ...utils.code_generation import regenerate_embedded_code_with_feedback

        task_config = context["task_config"]
        serial_port = self.app_config.serial_port
        compiled_code = context.get("compiled_code", context.get("generated_code", ""))
        matched_apis = context.get("matched_apis", {})
        selected_libraries = context.get("selected_libraries", {})
        llm_client = self._make_llm_client()

        if not serial_port:
            raise RuntimeError(
                "Serial port not configured. Cannot read serial output."
            )

        # Read serial output from the Arduino
        logger.info(f"Reading serial output from {serial_port}...")
        output_lines = await asyncio.to_thread(
            read_serial_output, serial_port
        )
        logger.info(f"Read {len(output_lines)} lines from serial")

        # Validate the debug output
        validation_result = await asyncio.to_thread(
            validate_debug_output_with_gpt,
            llm_client, output_lines, task_config.task_description,
        )

        logger.info(f"Validation result: {validation_result}")

        code_debug = compiled_code
        code_clean = None

        if validation_result.lower().startswith("pass"):
            # Validation passed — clean up debug info
            logger.info("Validation passed. Cleaning debug info from code...")
            code_clean = await asyncio.to_thread(
                clean_code_of_debug_info, llm_client, compiled_code
            )
        else:
            # Validation failed — attempt to regenerate with feedback
            logger.warning(f"Validation feedback: {validation_result}")

            # Collect library names
            all_libraries = []
            for component in task_config.components:
                if component in selected_libraries:
                    lib_info, _ = selected_libraries[component]
                    all_libraries.append(lib_info["Name"])

            component_str = ", ".join(task_config.components)
            library_str = ", ".join(all_libraries)
            pin_str = str(task_config.pin_connections)

            regenerated = await asyncio.to_thread(
                regenerate_embedded_code_with_feedback,
                llm_client,
                component_str,
                task_config.board_name,
                pin_str,
                task_config.task_description,
                library_str,
                matched_apis,
                validation_result,
                compiled_code,
            )
            code_debug = regenerated

        return {
            "code_debug": code_debug,
            "code_clean": code_clean,
            "serial_output": output_lines,
            "validation_result": validation_result,
        }
