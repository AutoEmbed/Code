"""History API routes — CRUD for pipeline run history."""

import json
import os
import logging
from datetime import datetime
from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/history")

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "history.json")


def _load_history() -> list:
    """Load history from the JSON file on disk."""
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            logger.error(f"Failed to load history: {e}")
    return []


def _save_history(history: list):
    """Persist history list to the JSON file on disk."""
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)


@router.get("")
def get_history():
    """Return the full history list (newest first)."""
    return _load_history()


@router.get("/{task_id}")
def get_history_item(task_id: str):
    """Return a single history item by task_id."""
    history = _load_history()
    for item in history:
        if item.get("task_id") == task_id:
            return item
    return {"error": "Not found"}


@router.post("")
def add_history_item(item: dict):
    """Add a new history item (prepended, capped at 100 entries)."""
    history = _load_history()
    item["timestamp"] = datetime.now().isoformat()
    history.insert(0, item)
    history = history[:100]
    _save_history(history)
    return {"status": "saved"}


@router.delete("/{task_id}")
def delete_history_item(task_id: str):
    """Delete a history item by task_id."""
    history = _load_history()
    history = [h for h in history if h.get("task_id") != task_id]
    _save_history(history)
    return {"status": "deleted"}
