<div align="center">

**English | [中文](README_zh.md)**

# AutoEmbed

**Towards Automated Software Development for Generic Embedded IoT Systems via LLMs**

The first fully automated software development platform for general-purpose embedded IoT systems — from natural language to verified code on real hardware.

[![SenSys 2026](https://img.shields.io/badge/ACM%20SenSys-2026-blue)](https://autoembed.github.io)
[![Paper](https://img.shields.io/badge/Paper-PDF-red)](https://autoembed.github.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-green)](https://github.com/AutoEmbed/AutoEmbed/releases)

[[Paper]](https://autoembed.github.io)&ensp;
[[Website]](https://autoembed.github.io)&ensp;
[[Download]](https://github.com/AutoEmbed/AutoEmbed/releases)&ensp;
[[BibTeX]](#citation)

</div>

## Highlights

- **95.7% coding accuracy** across 355 embedded IoT tasks on 71 hardware modules and 4 platforms
- **86.5% end-to-end success rate** including compilation, flashing, and runtime verification
- **+23.7 pp over GPT-4**, +27.7 pp over Claude, +30.7 pp over Gemini in zero-shot comparison
- **Zero API hallucination** — extracts real APIs from library source code instead of relying on LLM memory
- **Any Arduino-compatible component** — dynamically discovers from 7,000+ Arduino libraries

## How It Works

AutoEmbed automates the full hardware-in-the-loop development cycle through a 4-stage pipeline:

```
Natural Language Task
        │
        ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Library Solving │ ──▶ │    Knowledge     │ ──▶ │    Selective     │ ──▶ │      Auto-       │
│                  │     │   Generation     │     │ Memory Injection │     │   Programming    │
│ arduino-cli      │     │ .h → API table   │     │ TF-IDF retrieval │     │ Generate code    │
│ search + rank    │     │ .ino → patterns  │     │ relevant APIs    │     │ Compile → Fix    │
│ auto-install     │     │ LLM summary      │     │ 26.2% fewer      │     │ Flash → Verify   │
│                  │     │                  │     │ tokens           │     │ (nested loops)   │
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
                                                                                    │
                                                                                    ▼
                                                                          Verified Code on
                                                                           Real Hardware
```

## Quick Start

### Download

Download the latest installer from [**Releases**](https://github.com/AutoEmbed/AutoEmbed/releases):

| Platform | File | Size |
|----------|------|------|
| Windows | [`AutoEmbed-Setup-1.0.2.exe`](https://github.com/AutoEmbed/AutoEmbed/releases/download/v1.0.2/AutoEmbed-Setup-1.0.2.exe) | 101 MB |
| macOS (Apple Silicon) | [`AutoEmbed-1.0.2-mac-arm64.zip`](https://github.com/AutoEmbed/AutoEmbed/releases/download/v1.0.2/AutoEmbed-1.0.2-mac-arm64.zip) | 120 MB |
| macOS (Intel) | [`AutoEmbed-1.0.2-mac-x64.zip`](https://github.com/AutoEmbed/AutoEmbed/releases/download/v1.0.2/AutoEmbed-1.0.2-mac-x64.zip) | 124 MB |

> [!NOTE]
> **Prerequisites:** [Arduino CLI](https://arduino.github.io/arduino-cli/installation/), USB driver (CH340/CP2102), and any [OpenAI-compatible API](https://platform.openai.com/) key.

### Setup

1. Launch AutoEmbed and go to **Settings** — configure LLM API key, Arduino CLI path, serial port, and board type
2. Go to **Task Config** — select components, map pin connections, describe your task in natural language
3. Click **Start Pipeline** and watch it work

## Features

- **Natural Language → Deployed Code** — describe what you want, get compiled and verified Arduino code on real hardware
- **71+ Hardware Modules** — sensors, actuators, displays, communication modules across 14 categories
- **4-Stage Automated Pipeline** — Library Solving → Knowledge Generation → Selective Memory Injection → Auto-Programming
- **Nested Feedback Loops** — inner loop (compile → fix → recompile) + outer loop (flash → verify → recode) catches 73% of bugs before deployment
- **Real-time Progress** — WebSocket-based live updates for each pipeline stage
- **Built-in Code Editor** — Monaco editor for reviewing and editing generated code
- **One-Click Compile & Upload** — integrated Arduino CLI for seamless hardware deployment

<details>
<summary><b>Supported Hardware (71+ modules across 4 platforms)</b></summary>

### Platforms

| Platform | Architecture | Board |
|----------|-------------|-------|
| Arduino Uno | AVR | ATmega328P |
| STM32 Nucleo | ARM Cortex-M | STM32F4 |
| Raspberry Pi Pico | RP2040 | Dual-core ARM |
| ESP32 | Xtensa | Dual-core LX6 |

### Hardware Modules

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

</details>

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Desktop App                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │               React + TypeScript                  │  │
│  │   Settings → TaskConfig → Pipeline → CodeView     │  │
│  │      Ant Design 5  ·  Zustand  ·  Monaco          │  │
│  └────────────────────────┬──────────────────────────┘  │
│                      REST / WebSocket                    │
│  ┌────────────────────────┴──────────────────────────┐  │
│  │             Python FastAPI Backend                 │  │
│  │                                                    │  │
│  │   Stage 1: Library Solving                         │  │
│  │   Stage 2: Knowledge Generation                    │  │
│  │   Stage 3: Selective Memory Injection               │  │
│  │   Stage 4: Auto-Programming (nested feedback)      │  │
│  │                                                    │  │
│  │        LLM API (OpenAI-compatible)                 │  │
│  │        Arduino CLI  ·  Serial Port                 │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Development

```bash
git clone https://github.com/AutoEmbed/AutoEmbed.git
cd AutoEmbed

# Frontend
npm install

# Backend
pip install -r backend/requirements.txt

# Dev mode (Electron + Python backend)
npm run dev

# Build
npm run build:win    # Windows
npm run build:mac    # macOS
```

<details>
<summary><b>Tech Stack</b></summary>

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 33 |
| Frontend | React 18, TypeScript, Ant Design 5, Zustand, Monaco Editor |
| Backend | Python 3.11, FastAPI, Uvicorn |
| ML | scikit-learn (TF-IDF), OpenAI-compatible LLM API |
| Hardware | Arduino CLI, PySerial |
| Build | electron-vite, electron-builder (NSIS / DMG) |

</details>

<details>
<summary><b>Project Structure</b></summary>

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

</details>

## Citation

If you find AutoEmbed useful, please cite our paper:

```bibtex
@inproceedings{yang2026autoembed,
  title={AutoEmbed: Towards Automated Software Development for Generic Embedded IoT Systems via LLMs},
  author={Yang, Huanqi and Li, Mingzhe and Han, Mingda and Li, Zhenjiang and Xu, Weitao},
  booktitle={Proceedings of the ACM International Conference on Embedded Artificial Intelligence and Sensing Systems (SenSys)},
  year={2026}
}
```

## License

This project is licensed under the [MIT License](LICENSE).
