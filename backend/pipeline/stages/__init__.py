"""AutoEmbed pipeline stages — 8 stages from library discovery to validation."""

from .library_discovery import LibraryDiscoveryStage
from .api_extraction import APIExtractionStage
from .task_decomposition import TaskDecompositionStage
from .semantic_matching import SemanticMatchingStage
from .code_generation import CodeGenerationStage
from .compilation import CompilationStage
from .upload import UploadStage
from .validation import ValidationStage

__all__ = [
    "LibraryDiscoveryStage",
    "APIExtractionStage",
    "TaskDecompositionStage",
    "SemanticMatchingStage",
    "CodeGenerationStage",
    "CompilationStage",
    "UploadStage",
    "ValidationStage",
]
