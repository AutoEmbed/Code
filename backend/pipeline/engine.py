"""PipelineEngine — orchestrates the 8-stage AutoEmbed pipeline."""

import asyncio
import uuid
import time
import logging
from typing import Callable, Optional
from .models import AppConfig, TaskConfig, StageUpdate, StageStatus

logger = logging.getLogger(__name__)


class PipelineEngine:
    """Runs the 8 AutoEmbed pipeline stages sequentially.

    Each stage receives a shared context dict accumulating results, and
    progress is reported via an optional async callback.
    """

    def __init__(self, app_config: AppConfig):
        self.app_config = app_config
        self.stages = self._build_stages()
        self.cancelled = False

    def _build_stages(self):
        from .stages import (
            LibraryDiscoveryStage,
            APIExtractionStage,
            TaskDecompositionStage,
            SemanticMatchingStage,
            CodeGenerationStage,
            CompilationStage,
            UploadStage,
            ValidationStage,
        )
        return [
            LibraryDiscoveryStage(self.app_config),
            APIExtractionStage(self.app_config),
            TaskDecompositionStage(self.app_config),
            SemanticMatchingStage(self.app_config),
            CodeGenerationStage(self.app_config),
            CompilationStage(self.app_config),
            UploadStage(self.app_config),
            ValidationStage(self.app_config),
        ]

    async def run(
        self,
        task_config: TaskConfig,
        on_update: Optional[Callable] = None,
    ) -> dict:
        """Execute all pipeline stages in order.

        Args:
            task_config: The task configuration describing the embedded project.
            on_update: Optional async callback receiving StageUpdate objects.

        Returns:
            Dict with task_id, per-stage results, and final code outputs.

        Raises:
            RuntimeError: If any stage fails.
        """
        task_id = str(uuid.uuid4())
        context: dict = {
            "task_config": task_config,
            "task_id": task_id,
            "app_config": self.app_config,
        }
        stage_results: list[dict] = []

        for i, stage in enumerate(self.stages):
            if self.cancelled:
                logger.info("Pipeline cancelled by user")
                break

            start = time.time()

            # Notify: stage running
            if on_update:
                await on_update(StageUpdate(
                    stage=i,
                    stage_name=stage.name,
                    status=StageStatus.RUNNING,
                    message=f"Running {stage.name}...",
                ))

            try:
                result = await stage.execute(context)
                context.update(result)
                elapsed = int((time.time() - start) * 1000)

                stage_results.append({
                    "stage": stage.name,
                    "status": "completed",
                    "elapsed_ms": elapsed,
                })

                # Notify: stage completed
                if on_update:
                    await on_update(StageUpdate(
                        stage=i,
                        stage_name=stage.name,
                        status=StageStatus.COMPLETED,
                        progress=1.0,
                        elapsed_ms=elapsed,
                    ))

            except Exception as e:
                elapsed = int((time.time() - start) * 1000)
                logger.error(f"Stage {stage.name} failed: {e}", exc_info=True)

                stage_results.append({
                    "stage": stage.name,
                    "status": "failed",
                    "elapsed_ms": elapsed,
                    "error": str(e),
                })

                # Notify: stage failed
                if on_update:
                    await on_update(StageUpdate(
                        stage=i,
                        stage_name=stage.name,
                        status=StageStatus.FAILED,
                        message=str(e),
                        elapsed_ms=elapsed,
                    ))

                raise

        return {
            "task_id": task_id,
            "stages": stage_results,
            "code_debug": context.get("code_debug"),
            "code_clean": context.get("code_clean"),
            "serial_output": context.get("serial_output"),
        }

    def cancel(self):
        """Request cancellation of the running pipeline."""
        self.cancelled = True
        logger.info("Pipeline cancellation requested")
