# AutoEmbed

**Towards Automated Software Development for Generic Embedded IoT Systems via LLMs**

AutoEmbed is the first fully automated software development platform for general-purpose embedded IoT systems. It leverages LLMs and embedded system expertise to automate the entire hardware-in-the-loop development process — from natural language task descriptions to verified, deployed code on real hardware.

> **Huanqi Yang**, Mingzhe Li, Mingda Han, Zhenjiang Li, Weitao Xu
>
> City University of Hong Kong  |  Shandong University
>
> **ACM SenSys 2026** &nbsp; · &nbsp; [Paper](https://autoembed.github.io) &nbsp; · &nbsp; [Website](https://autoembed.github.io) &nbsp; · &nbsp; [Release](https://github.com/AutoEmbed/AutoEmbed/releases)

---

## Key Results

| Metric | Value |
|--------|-------|
| Coding Accuracy | **95.7%** across 355 tasks |
| End-to-End Success | **86.5%** (compile + flash + runtime verification) |
| vs. GPT-4 (zero-shot) | **+23.7pp** (72.0% → 95.7%) |
| vs. Claude (zero-shot) | **+27.7pp** (68.0% → 95.7%) |
| vs. Gemini (zero-shot) | **+30.7pp** (65.0% → 95.7%) |
| Hardware Modules Tested | **71** modules across 4 platforms |
| Platforms | Arduino Uno (AVR), STM32 (ARM), RPi Pico (RP2040), ESP32 (Xtensa) |

## Features

- **Natural Language → Deployed Code** — Describe what you want, get compiled and verified Arduino code running on real hardware
- **71+ Hardware Modules** — Sensors, actuators, displays, communication modules — plus any Arduino-compatible component via dynamic library discovery from 7,000+ Arduino libraries
- **4-Stage Automated Pipeline** — Library Solving → Knowledge Generation → Selective Memory Injection → Auto-Programming with nested feedback loops
- **Zero API Hallucination** — Extracts real APIs from library source code instead of relying on LLM memory
- **Nested Feedback Loops** — Inner loop (compile → fix → recompile) + Outer loop (flash → verify → recode) catches 73% of bugs before deployment
- **Real-time Progress** — WebSocket-based live updates for each pipeline stage
- **Built-in Code Editor** — Monaco editor for reviewing and editing generated code
- **One-Click Compile & Upload** — Integrated Arduino CLI for seamless hardware deployment
- **4 Platform Support** — Arduino Uno, STM32 Nucleo, Raspberry Pi Pico, ESP32

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
│  │                                                │  │
│  │  Stage 1: Library Solving                      │  │
│  │    arduino-cli search → 3D scoring → install   │  │
│  │                                                │  │
│  │  Stage 2: Knowledge Generation                 │  │
│  │    .h headers → API table                      │  │
│  │    .ino examples → usage patterns              │  │
│  │    LLM summary → knowledge base                │  │
│  │                                                │  │
│  │  Stage 3: Selective Memory Injection            │  │
│  │    TF-IDF retrieval → relevant APIs only       │  │
│  │    26.2% fewer tokens, higher accuracy         │  │
│  │                                                │  │
│  │  Stage 4: Auto-Programming                     │  │
│  │    Generate → Compile → Flash → Verify         │  │
│  │    (nested feedback loops)                     │  │
│  │                                                │  │
│  │       LLM API (OpenAI-compatible)              │  │
│  │       Arduino CLI · Serial Port                │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### Download

Download the latest installer from the [Releases](https://github.com/AutoEmbed/AutoEmbed/releases) page:

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

## Supported Hardware

**4 Development Platforms:**

| Platform | Architecture | Board |
|----------|-------------|-------|
| Arduino Uno | AVR | ATmega328P |
| STM32 Nucleo | ARM Cortex-M | STM32F4 |
| Raspberry Pi Pico | RP2040 | Dual-core ARM |
| ESP32 | Xtensa | Dual-core LX6 |

**71+ Hardware Modules** across categories:

| Category | Examples |
|----------|---------|
| Temperature | DHT11, DHT22, DS18B20, LM35, LM75, MLX90614, SHT31, SHT40 |
| Environmental | BME680, BME280, SGP30, SGP40 |
| Distance / Ultrasonic | HC-SR04, VL53L0X |
| Motion / IMU | ADXL345, ADXL362, MPU6050 |
| Light / Color / UV | TCS34725, APDS9960, BH1750, LTR390 |
| Gas | MQ-2, MQ-135, CCS811 |
| Pressure | MS5611, BMP085, BMP280 |
| Magnetometer / Compass | HMC5883L, QMC5883L |
| Power / Current | INA219, ADS1115 |
| Display | OLED (SSD1306), LCD (I2C) |
| Communication | LoRa, NFC, Wi-Fi, Bluetooth |
| Actuator / Output | Servo, Buzzer, LED, Relay, MCP4725 |
| Storage | SD Card, EEPROM |
| Input | PIR, IR Receiver, Rotary Encoder, HX711 |

> Any Arduino-compatible component works — AutoEmbed dynamically discovers libraries from the 7,000+ Arduino ecosystem and extracts APIs via LLM.

## Development

```bash
# Clone
git clone https://github.com/AutoEmbed/AutoEmbed.git
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

## Citation

```bibtex
@inproceedings{yang2026autoembed,
  title={AutoEmbed: Towards Automated Software Development for Generic Embedded IoT Systems via LLMs},
  author={Yang, Huanqi and Li, Mingzhe and Han, Mingda and Li, Zhenjiang and Xu, Weitao},
  booktitle={Proceedings of the 24th ACM Conference on Embedded Networked Sensor Systems (SenSys)},
  year={2026}
}
```

## License

[MIT](LICENSE)
