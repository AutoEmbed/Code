"""Pipeline API routes — start, status, cancel, result, and WebSocket progress."""

import asyncio
import json
import uuid
import logging
from typing import Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from ..pipeline.engine import PipelineEngine
from ..pipeline.models import AppConfig, TaskConfig, StageUpdate

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
            logger.error(f"Pipeline {task_id} failed: {e}")
            for ws in list(run.ws_connections):
                try:
                    await ws.send_json({"type": "pipeline_error", "error": str(e)})
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
