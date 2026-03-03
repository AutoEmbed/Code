"""Pipeline API routes — start, status, cancel, result, and WebSocket progress."""

import asyncio
import json
import os
import subprocess
import tempfile
import uuid
import logging
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from ..pipeline.engine import PipelineEngine
from ..pipeline.models import AppConfig, TaskConfig, StageUpdate
from ..utils.llm_client import LLMClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pipeline")


class PipelineRun:
    """In-memory state for a single pipeline execution."""

    def __init__(self):
        self.engine: PipelineEngine | None = None
        self.task: asyncio.Task | None = None
        self.result: dict | None = None
        self.updates: list[dict] = []
        self.status: str = "pending"
        self.ws_connections: list[WebSocket] = []


# In-memory store keyed by task_id
runs: Dict[str, PipelineRun] = {}


class StartRequest(BaseModel):
    task_config: TaskConfig
    app_config: AppConfig


@router.post("/preflight")
async def preflight_check(req: StartRequest):
    """Run pre-flight checks before starting the pipeline.

    Tests LLM API connectivity and, when not in code-only mode, verifies
    that the Arduino CLI path exists and a serial port is configured.
    Returns {"ok": bool, "issues": [{field, message}]}.
    """
    issues: List[dict] = []

    # --- 1. Test LLM API connectivity ---
    try:
        client = LLMClient(
            api_key=req.app_config.api_key,
            api_base_url=req.app_config.api_base_url,
            model=req.app_config.model,
        )
        reply = await asyncio.to_thread(client.send_request, "Reply OK")
        if reply.startswith("Error:"):
            issues.append({
                "field": "api_key",
                "message": f"LLM API check failed: {reply}",
            })
    except Exception as e:
        issues.append({
            "field": "api_key",
            "message": f"LLM API check failed: {e}",
        })

    # --- 2. Hardware checks (only when not code-only) ---
    if not req.task_config.code_only:
        cli_path = req.app_config.arduino_cli_path
        if not cli_path:
            issues.append({
                "field": "arduino_cli_path",
                "message": "Arduino CLI path is not configured.",
            })
        elif not os.path.exists(cli_path):
            issues.append({
                "field": "arduino_cli_path",
                "message": f"Arduino CLI not found at: {cli_path}",
            })

        if not req.app_config.serial_port:
            issues.append({
                "field": "serial_port",
                "message": "Serial port is not configured.",
            })

    return {"ok": len(issues) == 0, "issues": issues}


@router.post("/start")
async def start_pipeline(req: StartRequest):
    """Launch a new pipeline run and return its task_id."""
    task_id = str(uuid.uuid4())
    run = PipelineRun()
    run.engine = PipelineEngine(req.app_config)
    runs[task_id] = run

    async def on_update(update: StageUpdate):
        data = update.model_dump()
        run.updates.append(data)
        # Broadcast to all connected WebSocket clients
        for ws in list(run.ws_connections):
            try:
                await ws.send_json(data)
            except Exception:
                pass

    async def run_pipeline():
        run.status = "running"
        try:
            result = await run.engine.run(req.task_config, on_update=on_update)
            run.result = result
            run.status = "completed"
            # Notify WS clients of completion
            for ws in list(run.ws_connections):
                try:
                    await ws.send_json({"type": "pipeline_complete", "result": result})
                except Exception:
                    pass
        except Exception as e:
            run.status = "failed"
            # Preserve any generated code as partial result
            if run.engine and hasattr(run.engine, '_last_context'):
                ctx = run.engine._last_context
                code = ctx.get('generated_code')
                if code:
                    run.result = {
                        "code_debug": code,
                        "code_clean": code,
                        "partial": True,
                    }
            logger.error(f"Pipeline {task_id} failed: {e}")
            # Send both error AND partial result to WS clients
            for ws in list(run.ws_connections):
                try:
                    msg = {"type": "pipeline_error", "error": str(e)}
                    if run.result:
                        msg["partial_result"] = run.result
                    await ws.send_json(msg)
                except Exception:
                    pass

    run.task = asyncio.create_task(run_pipeline())
    return {"task_id": task_id, "status": "started"}


@router.get("/{task_id}/status")
async def get_status(task_id: str):
    """Return current status and all stage updates for a pipeline run."""
    run = runs.get(task_id)
    if not run:
        return {"error": "Pipeline not found"}
    return {
        "task_id": task_id,
        "status": run.status,
        "stages": run.updates,
    }


@router.post("/{task_id}/cancel")
async def cancel_pipeline(task_id: str):
    """Request cancellation of a running pipeline."""
    run = runs.get(task_id)
    if not run or not run.engine:
        return {"error": "Pipeline not found"}
    run.engine.cancel()
    run.status = "cancelled"
    return {"task_id": task_id, "status": "cancelled"}


@router.get("/{task_id}/result")
async def get_result(task_id: str):
    """Return the final result of a completed pipeline run."""
    run = runs.get(task_id)
    if not run:
        return {"error": "Pipeline not found"}
    if run.status != "completed":
        return {"status": run.status, "result": None}
    return {"status": "completed", "result": run.result}


@router.websocket("/ws/{task_id}")
async def pipeline_ws(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for real-time pipeline progress updates."""
    await websocket.accept()
    run = runs.get(task_id)
    if not run:
        await websocket.send_json({"error": "Pipeline not found"})
        await websocket.close()
        return

    run.ws_connections.append(websocket)

    # Send any existing updates so the client catches up
    for update in run.updates:
        await websocket.send_json(update)

    try:
        while True:
            # Keep connection alive; client can send "ping" to keep alive
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        if websocket in run.ws_connections:
            run.ws_connections.remove(websocket)


class RecompileRequest(BaseModel):
    code: str
    app_config: AppConfig


@router.post("/recompile")
async def recompile(req: RecompileRequest):
    """Compile provided code without running the full pipeline."""
    cli = req.app_config.arduino_cli_path
    fqbn = req.app_config.board_fqbn
    if not cli:
        return {"ok": False, "error": "Arduino CLI path not configured"}

    try:
        from ..pipeline.stages.compilation import ensure_board_core
        await asyncio.to_thread(ensure_board_core, cli, fqbn)
    except Exception as e:
        return {"ok": False, "error": f"Board core setup failed: {e}"}

    with tempfile.TemporaryDirectory() as tmpdir:
        sketch_dir = os.path.join(tmpdir, "sketch")
        os.makedirs(sketch_dir)
        with open(os.path.join(sketch_dir, "sketch.ino"), "w", encoding="utf-8") as f:
            f.write(req.code)

        result = await asyncio.to_thread(
            subprocess.run,
            [cli, "compile", "--fqbn", fqbn, sketch_dir],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode == 0:
            return {"ok": True, "output": result.stdout[-500:]}
        else:
            return {"ok": False, "error": result.stderr[-1000:]}


@router.post("/reupload")
async def reupload(req: RecompileRequest):
    """Compile and upload provided code to device."""
    cli = req.app_config.arduino_cli_path
    fqbn = req.app_config.board_fqbn
    port = req.app_config.serial_port
    if not cli:
        return {"ok": False, "error": "Arduino CLI path not configured"}
    if not port:
        return {"ok": False, "error": "Serial port not configured"}

    try:
        from ..pipeline.stages.compilation import ensure_board_core
        await asyncio.to_thread(ensure_board_core, cli, fqbn)
    except Exception:
        pass

    with tempfile.TemporaryDirectory() as tmpdir:
        sketch_dir = os.path.join(tmpdir, "sketch")
        os.makedirs(sketch_dir)
        with open(os.path.join(sketch_dir, "sketch.ino"), "w", encoding="utf-8") as f:
            f.write(req.code)

        comp = await asyncio.to_thread(
            subprocess.run,
            [cli, "compile", "--fqbn", fqbn, sketch_dir],
            capture_output=True, text=True, timeout=120,
        )
        if comp.returncode != 0:
            return {"ok": False, "error": f"Compilation failed:\n{comp.stderr[-500:]}"}

        up = await asyncio.to_thread(
            subprocess.run,
            [cli, "upload", "-p", port, "--fqbn", fqbn, sketch_dir],
            capture_output=True, text=True, timeout=120,
        )
        if up.returncode == 0:
            return {"ok": True, "output": up.stdout[-500:]}
        else:
            return {"ok": False, "error": f"Upload failed:\n{up.stderr[-500:]}"}
