"""Stage 3: Semantic Matching — match subtasks to library APIs via TF-IDF similarity."""

import asyncio
import logging
from typing import Callable, Optional
from .base import BaseStage

logger = logging.getLogger(__name__)


class SemanticMatchingStage(BaseStage):
    name = "Semantic Matching"
    index = 3

    async def execute(self, context: dict, on_progress: Optional[Callable] = None) -> dict:
        from ...utils.matching_utils import (
            extract_functionalities, extract_subtasks,
            get_top_n_similarities_and_apis, match_apis,
        )

        subtasks_dict = context["subtasks"]
        all_f_responses = context["all_f_responses"]
        all_i_responses = context["all_i_responses"]
        all_h_responses = context["all_h_responses"]

        # Merge functionality data across all components
        merged_functionalities = {}
        for component, f_data in all_f_responses.items():
            for ino_file, content in f_data.items():
                if isinstance(content, dict):
                    merged_functionalities[ino_file] = content
                elif isinstance(content, list):
                    # Some formats store as {filename: [{functionality, API}, ...]}
                    merged_functionalities[ino_file] = {ino_file: content}

        # Build the combined API table (enriched with best practices from ino processing)
        # Prefer the enriched i_responses; fall back to h_responses
        api_table = {}
        for component in all_h_responses:
            i_data = all_i_responses.get(component, {})
            h_data = all_h_responses.get(component, {})
            # If enriched data exists, use it; otherwise fall back to raw header data
            if i_data:
                for header, apis in i_data.items():
                    if header in api_table:
                        api_table[header].extend(apis)
                    else:
                        api_table[header] = list(apis)
            else:
                for header, apis in h_data.items():
                    if header in api_table:
                        api_table[header].extend(apis)
                    else:
                        api_table[header] = list(apis)

        # Extract flat lists for vectorization
        functionality_list = await asyncio.to_thread(
            extract_functionalities, merged_functionalities
        )
        subtask_list = await asyncio.to_thread(
            extract_subtasks, subtasks_dict
        )

        if not functionality_list:
            logger.warning("No functionalities extracted; matched_apis will be empty")
            return {"matched_apis": {}, "api_table": api_table}

        logger.info(
            f"Matching {len(subtask_list)} subtasks against {len(functionality_list)} functionalities"
        )

        top_similarities, api_set = await asyncio.to_thread(
            get_top_n_similarities_and_apis,
            subtask_list, functionality_list, merged_functionalities
        )

        matched_apis = await asyncio.to_thread(
            match_apis, api_set, api_table
        )

        logger.info(f"Matched {sum(len(v) for v in matched_apis.values())} APIs across headers")

        return {
            "matched_apis": matched_apis,
            "api_table": api_table,
            "top_similarities": top_similarities,
        }
