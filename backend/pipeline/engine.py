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
        self.stages = []  # built in run() based on task_config
        self.cancelled = False

    def _build_stages(self, code_only: bool = False):
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
        stages = [
            LibraryDiscoveryStage(self.app_config),
            APIExtractionStage(self.app_config),
            TaskDecompositionStage(self.app_config),
            SemanticMatchingStage(self.app_config),
            CodeGenerationStage(self.app_config),
        ]
        if not code_only:
            stages += [
                CompilationStage(self.app_config),
                UploadStage(self.app_config),
                ValidationStage(self.app_config),
            ]
        return stages

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
        self.stages = self._build_stages(code_only=task_config.code_only)
        task_id = str(uuid.uuid4())
        context: dict = {
            "task_config": task_config,
            "task_id": task_id,
            "app_config": self.app_config,
            "baud_rate": task_config.baud_rate,
        }
        stage_results: list[dict] = []

        # Notify frontend of total stage count
        if on_update:
            await on_update(StageUpdate(
                stage=-1,
                stage_name="init",
                status=StageStatus.PENDING,
                message="",
                detail={"total_stages": len(self.stages)},
            ))

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
                # Build a per-stage progress callback that sends StageUpdate
                # with RUNNING status so the frontend can show intra-stage progress.
                stage_progress = None
                if on_update:
                    async def _make_progress_cb(stage_idx, stage_name):
                        async def _cb(message: str, fraction: float):
                            await on_update(StageUpdate(
                                stage=stage_idx,
                                stage_name=stage_name,
                                status=StageStatus.RUNNING,
                                progress=max(0.0, min(1.0, fraction)),
                                message=message,
                            ))
                        return _cb
                    stage_progress = await _make_progress_cb(i, stage.name)

                result = await stage.execute(context, on_progress=stage_progress)
                context.update(result)
                self._last_context = dict(context)  # Save snapshot for partial recovery
                elapsed = int((time.time() - start) * 1000)

                stage_results.append({
                    "stage": stage.name,
                    "status": "completed",
                    "elapsed_ms": elapsed,
                })

                # Build rich completion message and detail
                msg, detail = self._stage_summary(stage.name, context)

                # Notify: stage completed
                if on_update:
                    await on_update(StageUpdate(
                        stage=i,
                        stage_name=stage.name,
                        status=StageStatus.COMPLETED,
                        progress=1.0,
                        elapsed_ms=elapsed,
                        message=msg,
                        detail=detail,
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

        # In code_only mode, use generated_code as the final output
        code_debug = context.get("code_debug") or context.get("generated_code")
        code_clean = context.get("code_clean") or context.get("generated_code")

        return {
            "task_id": task_id,
            "stages": stage_results,
            "code_debug": code_debug,
            "code_clean": code_clean,
            "serial_output": context.get("serial_output"),
        }

    @staticmethod
    def _stage_summary(stage_name: str, context: dict) -> tuple[str, dict]:
        """Generate rich completion message and detail dict for a stage."""
        detail: dict = {}

        if stage_name == "Library Discovery":
            libs = context.get("selected_libraries", {})
            names = {c: info[0].get("Name", "?") for c, info in libs.items() if info}
            detail = {"libraries": names}
            lib_list = ", ".join(f"{c} → {n}" for c, n in names.items())
            return f"Found {len(names)} libraries: {lib_list}", detail

        if stage_name == "API Extraction":
            h = context.get("all_h_responses", {})
            total_apis = sum(
                len(apis) for comp in h.values() for apis in comp.values()
            )
            detail = {"components": list(h.keys()), "total_apis": total_apis}
            return f"Extracted {total_apis} APIs from {len(h)} components", detail

        if stage_name == "Task Decomposition":
            subtasks = context.get("subtasks", {}).get("Subtasks", [])
            names = [s.get("task_name", s.get("name", "?")) for s in subtasks]
            detail = {"subtasks": names, "count": len(names)}
            return f"Decomposed into {len(names)} subtasks", detail

        if stage_name == "Semantic Matching":
            matched = context.get("matched_apis", {})
            total = sum(len(v) for v in matched.values())
            top_sims = context.get("top_similarities", [])[:5]
            top_list = [
                {"subtask": s, "functionality": f, "score": round(sc, 3)}
                for s, f, sc in top_sims
            ]
            detail = {"matched_apis": total, "top_matches": top_list}
            return f"Matched {total} APIs to subtasks", detail

        if stage_name == "Code Generation":
            code = context.get("generated_code", "")
            libs = context.get("all_libraries", [])
            baud = context.get("baud_rate", 9600)
            detail = {
                "code_length": len(code),
                "libraries": libs,
                "baud_rate": baud,
            }
            return f"Generated {len(code)} chars, baud={baud}", detail

        if stage_name == "Compilation":
            attempts = len([
                s for s in context.get("stages", [])
                if s.get("stage") == "Compilation"
            ]) or 1
            detail = {"compiled": True}
            return "Compilation successful", detail

        if stage_name == "Upload":
            port = context.get("app_config", object).__dict__.get("serial_port", "?") if hasattr(context.get("app_config"), "__dict__") else "?"
            detail = {"uploaded": True}
            return f"Uploaded to device", detail

        if stage_name == "Validation":
            output = context.get("serial_output", [])
            result = context.get("validation_result", "")
            passed = result.lower().startswith("pass") if result else False
            detail = {
                "serial_lines": len(output),
                "passed": passed,
                "result": result[:200] if result else "",
            }
            status = "PASSED" if passed else "needs review"
            return f"Validation {status}, {len(output)} serial lines", detail

        return "Completed", detail

    def cancel(self):
        """Request cancellation of the running pipeline."""
        self.cancelled = True
        logger.info("Pipeline cancellation requested")
