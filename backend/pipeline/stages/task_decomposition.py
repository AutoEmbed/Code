"""Stage 2: Task Decomposition — break the user task into subtasks using the LLM."""

import asyncio
import json
import logging
from typing import Callable, Optional
from .base import BaseStage

logger = logging.getLogger(__name__)


class TaskDecompositionStage(BaseStage):
    name = "Task Decomposition"
    index = 2

    async def execute(self, context: dict, on_progress: Optional[Callable] = None) -> dict:
        from ...utils.gpt_processing import generate_subtasks_with_gpt4

        task_config = context["task_config"]
        llm_client = self._make_llm_client()

        logger.info("Generating subtasks for the task...")
        raw_response = await asyncio.to_thread(
            generate_subtasks_with_gpt4,
            llm_client, task_config.task_description, task_config.components,
        )

        # Parse the JSON response
        try:
            if "```json" in raw_response:
                json_block = raw_response.split("```json", 1)[1].split("```", 1)[0].strip()
                subtasks = json.loads(json_block)
            else:
                subtasks = json.loads(raw_response)
        except (json.JSONDecodeError, IndexError) as exc:
            raise RuntimeError(f"Failed to parse subtasks from LLM response: {exc}") from exc

        logger.info(f"Generated {len(subtasks.get('Subtasks', []))} subtasks")

        return {
            "subtasks": subtasks,
        }
