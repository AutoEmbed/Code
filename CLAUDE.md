# AutoEmbed GUI

Electron desktop application for the AutoEmbed system — an LLM-driven automated code generation pipeline for Arduino embedded development. Accepted research paper.

## Architecture

```
Electron Main Process (src/main/)
  ├── Creates BrowserWindow (1400x900)
  ├── Spawns Python FastAPI backend (port 8765)
  └── IPC handlers for file dialogs + backend port

React Renderer (src/renderer/)
  ├── 5 pages: Settings → TaskConfig → Pipeline → CodeView → History
  ├── Zustand stores (5) for state management
  ├── WebSocket hook for real-time pipeline progress
  └── Ant Design 5 dark theme (#00b4d8 primary)

Python Backend (backend/)
  ├── FastAPI + Uvicorn on port 8765
  ├── REST API + WebSocket for pipeline progress
  └── PipelineEngine: 8 sequential stages
```

**Data flow**: UI (TaskConfig) → Zustand store → POST /api/pipeline/start → PipelineEngine → WebSocket updates → PipelineStore → CodeView/History

## Pipeline Stages (8)

| # | Stage | What it does |
|---|-------|-------------|
| 0 | Library Discovery | `arduino-cli lib search` for each component, TF-IDF ranking |
| 1 | API Extraction | LLM extracts API signatures from .h headers + .ino examples. Caches results as JSON in `backend/data/` |
| 2 | Task Decomposition | LLM breaks task description into subtasks |
| 3 | Semantic Matching | TF-IDF cosine similarity matches subtasks to extracted APIs |
| 4 | Code Generation | LLM generates Arduino .ino code using matched APIs |
| 5 | Compilation | `arduino-cli compile` with auto-retry (up to 5x) |
| 6 | Upload | `arduino-cli upload` via serial port |
| 7 | Validation | Read serial output to verify execution |

**Open component design**: Any component name works (not limited to pre-extracted JSON). Stage 0 dynamically searches Arduino libraries; Stage 1 extracts APIs via LLM if no cache exists. The JSON files in `backend/data/` are caches, not requirements.

## Project Structure

```
├── src/
│   ├── main/
│   │   ├── index.ts              # Electron app lifecycle, window + Python startup
│   │   ├── python-manager.ts     # Spawn/stop Python backend, health check
│   │   └── ipc-handlers.ts       # File/dir dialog IPC, backend port query
│   ├── preload/
│   │   └── index.ts              # contextBridge: electronAPI exposure
│   └── renderer/
│       ├── pages/                # Settings, TaskConfig, Pipeline, CodeView, History
│       ├── components/           # ComponentSelector, PinMappingTable, StageTimeline, StageDetail, SerialMonitor
│       ├── stores/               # configStore, taskStore, pipelineStore, navigationStore, historyStore
│       ├── hooks/useWebSocket.ts # WebSocket with auto-reconnect (5 retries, exponential backoff)
│       └── styles/               # theme.ts (darkAlgorithm), global.css
│
├── backend/
│   ├── main_api.py               # FastAPI entry point (supports both module and direct run)
│   ├── requirements.txt          # Python deps (fastapi, uvicorn, scikit-learn, pyserial, etc.)
│   ├── api/                      # Route handlers: pipeline_routes, settings_routes, history_routes
│   ├── pipeline/
│   │   ├── engine.py             # PipelineEngine orchestrator
│   │   ├── models.py             # Pydantic: AppConfig, TaskConfig, StageUpdate, PipelineResult
│   │   └── stages/               # 8 stage implementations + base.py
│   ├── utils/                    # llm_client, gpt_processing, api_utils, matching_utils, code_generation, file_utils
│   └── data/                     # 174 pre-extracted JSON cache files (Header/, Example/, Functionality/) + Example_tasks.json
│
├── scripts/
│   ├── setup-windows.bat         # Windows dependency installation
│   ├── start.bat                 # Windows one-click launch
│   └── pack-python.sh            # Python env bundling for distribution
│
├── electron-builder.yml          # NSIS (Windows) + DMG (Mac) packaging config
├── electron.vite.config.ts       # Vite config for main/preload/renderer
└── README-使用指南.md            # Chinese user guide
```

## Development

```bash
# Install dependencies
npm install
pip install -r backend/requirements.txt

# Run in dev mode (starts Electron + Python backend)
npm run dev

# Build frontend only
npm run build

# Build distributable
npm run build:win   # Windows NSIS
npm run build:mac   # macOS DMG
```

**Python backend is spawned automatically** by Electron main process via `python-manager.ts`. In dev mode it uses system `python3`; in production it looks for bundled `python-env/`.

The Python backend runs as module: `python3 -m backend.main_api --port 8765` with `cwd` set to project root. The `main_api.py` has a try/except for both relative and absolute imports to support both modes.

## Key Technical Decisions

- **`mode="tags"` in ComponentSelector**: Allows free-text input for any component, not just the predefined 30+. Custom components shown in green, predefined in blue.
- **WebSocket for pipeline progress**: Real-time stage updates streamed to frontend. Auto-reconnect with exponential backoff (up to 5 retries).
- **JSON cache in `backend/data/`**: Pre-extracted API data for 60+ known components. Unknown components trigger LLM extraction on first use, results are cached.
- **Zustand stores**: 5 independent stores (config, task, pipeline, navigation, history). NavigationStore enables cross-page navigation from child components.
- **Monaco Editor**: Used in CodeView for syntax-highlighted Arduino C++ code display.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/pipeline/start | Start pipeline, returns task_id |
| GET | /api/pipeline/{id}/status | Get pipeline status + stage updates |
| POST | /api/pipeline/{id}/cancel | Cancel running pipeline |
| GET | /api/pipeline/{id}/result | Get final code output |
| WS | /api/pipeline/ws/{id} | Real-time stage progress |
| GET | /api/settings/ports | List available serial ports |
| POST | /api/settings/validate-cli | Validate Arduino CLI path |
| GET | /api/settings/presets | Load example tasks |
| GET | /api/history | List history (capped 100) |
| POST | /api/history | Save task result |
| DELETE | /api/history/{id} | Delete history entry |
| GET | /health | Backend health check |

## LLM Configuration

Uses OpenAI-compatible API. Tested with:
- **API**: Yunwu `https://yunwu.ai/v1`
- **Model**: `gpt-4.1-mini`
- User provides their own API key in Settings page.

## Conventions

- Frontend: TypeScript strict, React functional components, Ant Design 5 with dark theme
- Backend: Python 3.10+, FastAPI async, Pydantic v2 models
- State: Zustand (no Redux), each store in its own file
- Styling: Ant Design `darkAlgorithm` theme token, inline styles (no CSS modules)
- Pipeline stages: Each extends `BaseStage`, implements `async execute(context) -> dict`, uses `asyncio.to_thread()` for blocking ops
