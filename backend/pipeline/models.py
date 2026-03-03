"""Pydantic models for AutoEmbed pipeline configuration and state tracking."""

from pydantic import BaseModel, model_validator
from typing import Optional
from enum import Enum
import subprocess
import os
import platform as platform_mod
import json as json_mod


class StageStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AppConfig(BaseModel):
    api_key: str
    api_base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-3.5-turbo"
    arduino_cli_path: str = ""
    serial_port: str = ""
    board_fqbn: str = "arduino:avr:uno"
    board_name: str = "Arduino Uno"
    libraries_dir: str = ""
    target_architecture: str = "avr"

    @model_validator(mode='after')
    def resolve_libraries_dir(self) -> 'AppConfig':
        """Auto-detect libraries_dir if left empty."""
        if self.libraries_dir:
            os.makedirs(self.libraries_dir, exist_ok=True)
            return self
        # Try arduino-cli config dump
        if self.arduino_cli_path:
            try:
                result = subprocess.run(
                    [self.arduino_cli_path, 'config', 'dump', '--format', 'json'],
                    capture_output=True, text=True, timeout=5,
                )
                if result.returncode == 0:
                    cfg = json_mod.loads(result.stdout)
                    user_dir = cfg.get('directories', {}).get('user', '')
                    if user_dir:
                        self.libraries_dir = os.path.join(user_dir, 'libraries')
            except Exception:
                pass
        # Fallback: platform default
        if not self.libraries_dir:
            home = os.path.expanduser('~')
            if platform_mod.system() == 'Windows':
                self.libraries_dir = os.path.join(home, 'Documents', 'Arduino', 'libraries')
            else:
                self.libraries_dir = os.path.join(home, 'Arduino', 'libraries')
        os.makedirs(self.libraries_dir, exist_ok=True)
        return self


class TaskConfig(BaseModel):
    components: list[str]
    task_description: str
    pin_connections: dict[str, str]
    board_name: str = "Arduino Uno"
    board_fqbn: str = "arduino:avr:uno"
    baud_rate: Optional[int] = None  # None = auto-detect from generated code
    code_only: bool = False  # Skip compilation, upload, validation stages


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
