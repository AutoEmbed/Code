# AutoEmbed

**LLM-driven automated code generation for Arduino embedded systems.**

AutoEmbed is a desktop application that automatically generates, compiles, uploads, and validates Arduino code from natural language task descriptions. It uses large language models to extract hardware APIs from library source code, decompose tasks into subtasks, and synthesize working embedded programs — end to end.

> Paper accepted. More details coming soon.

---

## Features

- **Natural Language to Working Code** — Describe what you want in plain English, get compiled and uploaded Arduino code
- **8-Stage Pipeline** — Library Discovery → API Extraction → Task Decomposition → Semantic Matching → Code Generation → Compilation → Upload → Validation
- **30+ Supported Sensors** — DHT11, BME680, MPU6050, VL53L0X, HC-SR04, and many more — plus any Arduino-compatible component via dynamic library discovery
- **Real-time Progress** — WebSocket-based live updates for each pipeline stage
- **Code Editor** — Built-in Monaco editor for reviewing and editing generated code
- **One-Click Compile & Upload** — Integrated Arduino CLI for seamless hardware deployment
- **Task Templates** — Save and reuse common task configurations
- **History** — Browse, re-run, and manage previous pipeline executions

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Electron Desktop App                │
│  ┌───────────────────────────────────────────────┐  │
│  │              React + TypeScript                │  │
│  │  Settings → TaskConfig → Pipeline → CodeView  │  │
│  │     Ant Design 5  ·  Zustand  ·  Monaco       │  │
│  └──────────────────────┬────────────────────────┘  │
│                    REST / WebSocket                   │
│  ┌──────────────────────┴────────────────────────┐  │
│  │           Python FastAPI Backend               │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │           Pipeline Engine                 │ │  │
│  │  │  Library   API      Task    Semantic      │ │  │
│  │  │  Discovery Extract  Decomp  Matching      │ │  │
│  │  │  Code Gen  Compile  Upload  Validation    │ │  │
│  │  └──────────────────────────────────────────┘ │  │
│  │       LLM API (OpenAI-compatible)             │  │
│  │       Arduino CLI · Serial Port               │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### Download

Download the latest installer from the [Releases](https://github.com/AutoEmbed/Code/releases) page:

| Platform | File |
|----------|------|
| Windows  | `AutoEmbed-Setup-x.x.x.exe` |
| macOS (Apple Silicon) | `AutoEmbed-x.x.x-mac-arm64.zip` |
| macOS (Intel) | `AutoEmbed-x.x.x-mac-x64.zip` |

### Prerequisites

- **Arduino CLI** — [Install guide](https://arduino.github.io/arduino-cli/installation/)
- **USB Driver** — CH340 or CP2102, depending on your board
- **LLM API Key** — Any OpenAI-compatible API (e.g., OpenAI, Azure, or third-party providers)

### Setup

1. Install and launch AutoEmbed
2. Go to **Settings** and configure:
   - LLM API Key, Base URL, and Model
   - Arduino CLI path
   - Serial port and board type
3. Go to **Task Config**:
   - Select your components (e.g., DHT11, Servo)
   - Map pin connections
   - Describe your task in natural language
4. Click **Start Pipeline** and watch it work

## Supported Components

| Category | Components |
|----------|-----------|
| Temperature | DHT11, DS18B20, LM35, LM75, MLX90614 |
| Environmental | BME680, BME280, SHT40, SGP30, SGP40 |
| Distance | HC-SR04, VL53L0X |
| Motion | ADXL345, MPU6050, ADXL362 |
| Light / Color | TCS34725, APDS9960, BH1750, LTR390 |
| Pressure | MS5611 |
| Power | INA219, ADS1115 |
| Other | HX711, MCP4725, SD, Servo, Buzzer, LED, PIR, Relay, LoRa, NFC |

> Any Arduino-compatible component works — AutoEmbed dynamically discovers and extracts APIs from Arduino libraries.

## Development

```bash
# Clone
git clone https://github.com/AutoEmbed/Code.git
cd Code

# Install frontend dependencies
npm install

# Install backend dependencies
pip install -r backend/requirements.txt

# Run in development mode
npm run dev

# Build for distribution
npm run build:win    # Windows
npm run build:mac    # macOS
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 33 |
| Frontend | React 18, TypeScript, Ant Design 5, Zustand, Monaco Editor |
| Backend | Python 3.11, FastAPI, Uvicorn |
| ML | scikit-learn (TF-IDF), OpenAI-compatible LLM API |
| Hardware | Arduino CLI, PySerial |
| Build | electron-vite, electron-builder (NSIS / DMG) |

## Project Structure

```
├── src/
│   ├── main/           # Electron main process, Python lifecycle management
│   ├── preload/        # Secure context bridge
│   └── renderer/
│       ├── pages/      # Settings, TaskConfig, Pipeline, CodeView, History
│       ├── components/ # StageTimeline, StageDetail, SerialMonitor, etc.
│       ├── stores/     # Zustand state management (5 stores)
│       └── hooks/      # WebSocket with auto-reconnect
│
├── backend/
│   ├── api/            # FastAPI route handlers
│   ├── pipeline/
│   │   ├── engine.py   # Pipeline orchestrator
│   │   └── stages/     # 8 pipeline stage implementations
│   ├── utils/          # LLM client, file processing, matching algorithms
│   └── data/           # Pre-extracted API cache (170+ JSON files)
│
└── scripts/            # Setup and packaging scripts
```

## License

[MIT](LICENSE)
