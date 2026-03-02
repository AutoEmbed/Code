import argparse
import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from .api.pipeline_routes import router as pipeline_router
    from .api.settings_routes import router as settings_router
    from .api.history_routes import router as history_router
except ImportError:
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
