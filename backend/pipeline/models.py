"""Pydantic models for AutoEmbed pipeline configuration and state tracking."""

from pydantic import BaseModel
from typing import Optional
from enum import Enum


class StageStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AppConfig(BaseModel):
    api_key: str
    api_base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-3.5-turbo"
    arduino_cli_path: str
    serial_port: str = ""
    board_fqbn: str = "arduino:avr:uno"
    board_name: str = "Arduino Uno"
    libraries_dir: str = ""
    target_architecture: str = "avr"


class TaskConfig(BaseModel):
    components: list[str]
    task_description: str
    pin_connections: dict[str, str]
    board_name: str = "Arduino Uno"
    board_fqbn: str = "arduino:avr:uno"


class StageUpdate(BaseModel):
    stage: int
    stage_name: str
    status: StageStatus
    progress: float = 0.0
    message: str = ""
    elapsed_ms: int = 0
    detail: Optional[dict] = None


class PipelineResult(BaseModel):
    task_id: str
    status: str
    code_debug: Optional[str] = None
    code_clean: Optional[str] = None
    stages: list[dict] = []
    serial_output: Optional[list[str]] = None
