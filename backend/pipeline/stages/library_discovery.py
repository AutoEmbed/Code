"""Stage 0: Library Discovery — find and download Arduino libraries for each component."""

import asyncio
import logging
from typing import Callable, Optional
from .base import BaseStage

logger = logging.getLogger(__name__)


class LibraryDiscoveryStage(BaseStage):
    name = "Library Discovery"
    index = 0

    async def execute(self, context: dict, on_progress: Optional[Callable] = None) -> dict:
        from ...utils.api_utils import find_best_library_for_component, download_library

        task_config = context["task_config"]
        arduino_cli_path = self.app_config.arduino_cli_path
        libraries_dir = self.app_config.libraries_dir
        target_architecture = self.app_config.target_architecture
        components = task_config.components
        total = len(components)

        selected_libraries = {}  # component_name -> library_info tuple
        component_libraries = {}  # component_name -> folder_name (actual installed name)

        for idx, component in enumerate(components):
            if on_progress:
                await on_progress(
                    f"Searching library for {component} ({idx + 1}/{total})...",
                    idx / total,
                )
            logger.info(f"Searching library for component: {component}")

            best = await asyncio.to_thread(
                find_best_library_for_component,
                arduino_cli_path, target_architecture, component
            )

            if best is None:
                raise RuntimeError(f"No compatible library found for component: {component}")

            lib_info, scores = best
            lib_name = lib_info["Name"]
            logger.info(f"Best library for '{component}': {lib_name} (score={scores['total_score']:.3f})")
            selected_libraries[component] = best

            # Download the library
            folder_name = await asyncio.to_thread(
                download_library, arduino_cli_path, libraries_dir, lib_name
            )

            if folder_name is None:
                # Library may already be installed; use the library name as folder
                logger.warning(
                    f"Library '{lib_name}' may already be installed. Using name as folder."
                )
                folder_name = lib_name.replace(" ", "_")

            component_libraries[component] = folder_name
            logger.info(f"Library folder for '{component}': {folder_name}")

        return {
            "selected_libraries": selected_libraries,
            "component_libraries": component_libraries,
        }
