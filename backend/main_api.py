import argparse
import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import sys as _sys

def _is_running_as_package():
    return __spec__ is not None and __spec__.parent

if _is_running_as_package():
    from .api.pipeline_routes import router as pipeline_router
    from .api.settings_routes import router as settings_router
    from .api.history_routes import router as history_router
else:
    # Direct script execution: add parent dir to path
    _sys.path.insert(0, _sys.path[0] if _sys.path else '.')
    from api.pipeline_routes import router as pipeline_router
    from api.settings_routes import router as settings_router
    from api.history_routes import router as history_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="AutoEmbed Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(pipeline_router)
app.include_router(settings_router)
app.include_router(history_router)


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--host", type=str, default="127.0.0.1")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)
