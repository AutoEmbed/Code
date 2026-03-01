"""Stage 1: API Extraction — extract API info from library headers and examples."""

import asyncio
import json
import os
import logging
from .base import BaseStage

logger = logging.getLogger(__name__)


def _parse_json_response(response: str):
    """Extract and parse JSON from an LLM response that may be wrapped in markdown."""
    if "```json" in response:
        json_block = response.split("```json", 1)[1].split("```", 1)[0].strip()
        return json.loads(json_block)
    return json.loads(response)


class APIExtractionStage(BaseStage):
    name = "API Extraction"
    index = 1

    async def execute(self, context: dict) -> dict:
        from ...utils.file_utils import (
            find_header_files, find_ino_files,
            read_header_file_content, read_ino_file_content, remove_comments,
        )
        from ...utils.gpt_processing import (
            process_header_with_gpt4, process_ino_with_gpt4, functionality_with_gpt4,
        )

        task_config = context["task_config"]
        component_libraries = context["component_libraries"]
        selected_libraries = context["selected_libraries"]
        libraries_dir = self.app_config.libraries_dir

        llm_client = self._make_llm_client()

        # Data directory for caching extracted API data
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data")
        os.makedirs(data_dir, exist_ok=True)

        all_h_responses = {}  # component -> {header_file: parsed_api_list}
        all_i_responses = {}  # component -> {header_file: enriched_api_list}
        all_f_responses = {}  # component -> {ino_file: functionality_list}

        for component in task_config.components:
            folder_name = component_libraries[component]
            lib_info, _ = selected_libraries[component]
            lib_name = lib_info["Name"]

            safe_name = lib_name.replace(" ", "_")
            h_cache = os.path.join(data_dir, f"{safe_name}_Header.json")
            i_cache = os.path.join(data_dir, f"{safe_name}_Example.json")
            f_cache = os.path.join(data_dir, f"{safe_name}_Functionality.json")

            # --- Header processing ---
            if os.path.exists(h_cache):
                logger.info(f"Loading cached header data for {lib_name}")
                with open(h_cache, "r", encoding="utf-8") as f:
                    all_h_responses[component] = json.load(f)
            else:
                logger.info(f"Extracting APIs from headers for {lib_name}")
                header_files = await asyncio.to_thread(
                    find_header_files, folder_name, libraries_dir
                )
                h_result = {}
                for hf in header_files:
                    content = await asyncio.to_thread(read_header_file_content, hf)
                    content = remove_comments(content)
                    file_name = os.path.basename(hf)
                    resp = await asyncio.to_thread(
                        process_header_with_gpt4, llm_client, content, file_name
                    )
                    try:
                        parsed = _parse_json_response(resp)
                        h_result[file_name] = parsed
                    except (json.JSONDecodeError, IndexError):
                        logger.warning(f"Could not parse header response for {file_name}")
                        h_result[file_name] = []

                all_h_responses[component] = h_result
                with open(h_cache, "w", encoding="utf-8") as f:
                    json.dump(h_result, f, indent=2, ensure_ascii=False)

            # --- Example (.ino) processing ---
            if os.path.exists(i_cache):
                logger.info(f"Loading cached example data for {lib_name}")
                with open(i_cache, "r", encoding="utf-8") as f:
                    all_i_responses[component] = json.load(f)
            else:
                logger.info(f"Extracting best practices from examples for {lib_name}")
                ino_files = await asyncio.to_thread(
                    find_ino_files, folder_name, libraries_dir
                )
                i_result = {}
                for ino_f in ino_files:
                    content = await asyncio.to_thread(read_ino_file_content, ino_f)
                    file_name = os.path.basename(ino_f)
                    resp = await asyncio.to_thread(
                        process_ino_with_gpt4, llm_client, content, file_name,
                        all_h_responses[component]
                    )
                    if isinstance(resp, dict):
                        for header, apis in resp.items():
                            if header in i_result:
                                i_result[header].extend(apis)
                            else:
                                i_result[header] = apis

                all_i_responses[component] = i_result
                with open(i_cache, "w", encoding="utf-8") as f:
                    json.dump(i_result, f, indent=2, ensure_ascii=False)

            # --- Functionality extraction ---
            if os.path.exists(f_cache):
                logger.info(f"Loading cached functionality data for {lib_name}")
                with open(f_cache, "r", encoding="utf-8") as f:
                    all_f_responses[component] = json.load(f)
            else:
                logger.info(f"Extracting functionalities from examples for {lib_name}")
                ino_files = await asyncio.to_thread(
                    find_ino_files, folder_name, libraries_dir
                )
                f_result = {}
                for ino_f in ino_files:
                    content = await asyncio.to_thread(read_ino_file_content, ino_f)
                    file_name = os.path.basename(ino_f)
                    resp = await asyncio.to_thread(
                        functionality_with_gpt4, llm_client, content, file_name,
                        component, lib_name
                    )
                    try:
                        parsed = _parse_json_response(resp)
                        f_result[file_name] = parsed
                    except (json.JSONDecodeError, IndexError):
                        logger.warning(f"Could not parse functionality response for {file_name}")
                        f_result[file_name] = {}

                all_f_responses[component] = f_result
                with open(f_cache, "w", encoding="utf-8") as f:
                    json.dump(f_result, f, indent=2, ensure_ascii=False)

        return {
            "all_h_responses": all_h_responses,
            "all_i_responses": all_i_responses,
            "all_f_responses": all_f_responses,
        }
