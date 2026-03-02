"""Stage 4: Code Generation — generate Arduino sketch code using the LLM."""

import asyncio
import json
import re
import logging
from .base import BaseStage

logger = logging.getLogger(__name__)


class CodeGenerationStage(BaseStage):
    name = "Code Generation"
    index = 4

    async def execute(self, context: dict) -> dict:
        from ...utils.code_generation import generate_embedded_code_with_gpt4

        task_config = context["task_config"]
        matched_apis = context["matched_apis"]
        selected_libraries = context["selected_libraries"]
        llm_client = self._make_llm_client()

        # Collect all library names
        all_libraries = []
        for component in task_config.components:
            lib_info, _ = selected_libraries[component]
            all_libraries.append(lib_info["Name"])

        component_str = ", ".join(task_config.components)
        library_str = ", ".join(all_libraries)
        pin_str = json.dumps(task_config.pin_connections, indent=2)

        logger.info(f"Generating code for components: {component_str}")

        raw_response = await asyncio.to_thread(
            generate_embedded_code_with_gpt4,
            llm_client,
            component_str,
            task_config.board_name,
            pin_str,
            task_config.task_description,
            library_str,
            matched_apis,
        )

        # Extract the code block from the response
        code_match = re.search(r"```cpp(.*?)```", raw_response, re.DOTALL)
        if code_match:
            generated_code = code_match.group(1).strip()
        else:
            logger.warning("No ```cpp block found in response; using raw response as code")
            generated_code = raw_response.strip()

        logger.info(f"Generated code: {len(generated_code)} characters")

        # Auto-detect baud rate from generated code if not specified by user
        if not context.get('baud_rate'):
            baud_match = re.search(r'Serial\.begin\s*\(\s*(\d+)\s*\)', generated_code)
            context['baud_rate'] = int(baud_match.group(1)) if baud_match else 9600
            logger.info(f"Auto-detected baud rate: {context['baud_rate']}")

        return {
            "generated_code": generated_code,
            "all_libraries": all_libraries,
            "baud_rate": context['baud_rate'],
        }
