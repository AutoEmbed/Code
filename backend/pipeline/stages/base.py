"""Base class for all pipeline stages."""

import time
import logging
from abc import ABC, abstractmethod
from typing import Callable, Optional
from ..models import AppConfig

logger = logging.getLogger(__name__)


class BaseStage(ABC):
    """Abstract base class for pipeline stages.

    Each stage wraps a section of the original AutoEmbed main.py.
    Stages accept a shared context dict and return results to merge back.
    """

    name: str = "base"
    index: int = 0

    def __init__(self, app_config: AppConfig):
        self.app_config = app_config

    @abstractmethod
    async def execute(self, context: dict, on_progress: Optional[Callable] = None) -> dict:
        """Execute the stage.

        Args:
            context: Accumulated results from previous stages plus initial config.
            on_progress: Optional async callback ``async on_progress(message, fraction)``
                where *fraction* is 0.0-1.0 indicating intra-stage progress.

        Returns:
            Dict of results to merge into context for subsequent stages.
        """
        pass

    def _make_llm_client(self):
        """Create an LLMClient from the app config."""
        from ...utils.llm_client import LLMClient
        return LLMClient(
            api_key=self.app_config.api_key,
            api_base_url=self.app_config.api_base_url,
            model=self.app_config.model,
        )
