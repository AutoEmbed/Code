"""Batch-generate API cache for components missing from pre-extracted data.

Uses LLM knowledge of common Arduino libraries to generate Header, Example,
and Functionality JSON caches without needing arduino-cli or library downloads.
"""

import json
import os
import sys
import requests
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
logger = logging.getLogger(__name__)

API_KEY = os.environ.get("LLM_API_KEY", "YOUR_API_KEY_HERE")
API_BASE = os.environ.get("LLM_API_BASE", "https://api.openai.com/v1")
MODEL = os.environ.get("LLM_MODEL", "gpt-4o-mini")

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "data")

# Components to extract: (component_name, arduino_library_name, main_header_file)
MISSING_COMPONENTS = [
    ("DHT20", "DHT20", "DHT20.h"),
    ("DHT22", "DHT", "DHT.h"),
    ("SHT31", "Adafruit SHT31 Library", "Adafruit_SHT31.h"),
    ("SHT40", "Adafruit SHT4x Library", "Adafruit_SHT4x.h"),
    ("SHT41", "Adafruit SHT4x Library", "Adafruit_SHT4x.h"),  # same lib as SHT40
    ("SHT45", "Adafruit SHT4x Library", "Adafruit_SHT4x.h"),  # same lib as SHT40
    ("BMP180", "Adafruit BMP085 Unified", "Adafruit_BMP085_U.h"),
    ("LTR329", "LTR329 and LTR303", "LTR329_LTR303.h"),
    ("LTR303", "LTR329 and LTR303", "LTR329_LTR303.h"),
    ("MPU9250", "MPU9250", "MPU9250.h"),
    ("QMC5883L", "QMC5883LCompass", "QMC5883LCompass.h"),
    ("SH1106", "Adafruit SH110X", "Adafruit_SH110X.h"),
    ("SSD1331", "Adafruit SSD1331 OLED Driver Library for Arduino", "Adafruit_SSD1331.h"),
    ("SSD1351", "Adafruit SSD1351 library", "Adafruit_SSD1351.h"),
    ("ST7735", "Adafruit ST7735 and ST7789 Library", "Adafruit_ST7735.h"),
    ("ILI9341", "Adafruit ILI9341", "Adafruit_ILI9341.h"),
    ("RFM95", "RadioHead", "RH_RF95.h"),
    ("DS1307", "RTClib", "RTClib.h"),
    ("AD9850", "AD9850", "AD9850.h"),
]


def llm_request(prompt: str) -> str:
    """Send a request to the LLM API."""
    url = f"{API_BASE}/chat/completions"
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'model': MODEL,
        'messages': [{'role': 'user', 'content': prompt}]
    }
    for attempt in range(3):
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=120)
            if resp.status_code == 200:
                return resp.json()['choices'][0]['message']['content']
            logger.warning(f"API error {resp.status_code}, retry {attempt+1}")
            time.sleep(2)
        except Exception as e:
            logger.warning(f"Request failed: {e}, retry {attempt+1}")
            time.sleep(2)
    return ""


def parse_json_response(response: str):
    """Extract JSON from LLM response (may be wrapped in ```json blocks)."""
    if "```json" in response:
        block = response.split("```json", 1)[1].split("```", 1)[0].strip()
        return json.loads(block)
    if "```" in response:
        block = response.split("```", 1)[1].split("```", 1)[0].strip()
        return json.loads(block)
    return json.loads(response)


def generate_header_cache(lib_name: str, header_file: str) -> dict:
    """Generate Header cache: {header_file: [api_list]}."""
    prompt = f"""You are an expert on Arduino libraries. For the library "{lib_name}",
generate the public API information from its main header file "{header_file}".

Extract all public API functions (NOT constructors, destructors, or operators).
For each API, provide:
- name: function name
- description: concise description (under 20 words)
- parameters: list of parameter strings like "int pin"
- return_type: return type string

Output as JSON array wrapped in ```json blocks. Example:
```json
[
    {{"name": "begin", "description": "Initialize the sensor", "parameters": ["uint8_t addr"], "return_type": "bool"}},
    {{"name": "readTemperature", "description": "Read temperature in Celsius", "parameters": [], "return_type": "float"}}
]
```

Generate the complete API list for {lib_name} ({header_file}):"""

    resp = llm_request(prompt)
    try:
        apis = parse_json_response(resp)
        return {header_file: apis}
    except (json.JSONDecodeError, IndexError) as e:
        logger.error(f"Failed to parse Header for {lib_name}: {e}")
        return {header_file: []}


def generate_example_cache(lib_name: str, header_file: str, header_apis: list) -> dict:
    """Generate Example cache: {header_file: [api_with_practices]}."""
    api_names = [a["name"] for a in header_apis] if header_apis else []
    prompt = f"""You are an expert on Arduino libraries. For the library "{lib_name}",
enrich the following APIs with best practices from typical example usage.

APIs: {json.dumps(api_names)}

For each API, provide the original fields (name, description, parameters, return_type)
PLUS a "practices" object with:
- "API order": when to call this relative to other APIs
- "parameter usage": how parameters are typically used
- "return value handling": how to handle the return value

Output as JSON array wrapped in ```json blocks. Example:
```json
[
    {{
        "name": "begin",
        "description": "Initialize the sensor",
        "parameters": ["uint8_t addr"],
        "return_type": "bool",
        "practices": {{
            "API order": "Call in setup() before any readings",
            "parameter usage": "Use default I2C address 0x44 if not specified",
            "return value handling": "Check bool return to verify sensor is connected"
        }}
    }}
]
```

Generate for all APIs of {lib_name}:"""

    resp = llm_request(prompt)
    try:
        apis = parse_json_response(resp)
        return {header_file: apis}
    except (json.JSONDecodeError, IndexError) as e:
        logger.error(f"Failed to parse Example for {lib_name}: {e}")
        return {header_file: []}


def generate_functionality_cache(lib_name: str, component: str) -> dict:
    """Generate Functionality cache: {example.ino: {example.ino: [functionality]}}."""
    prompt = f"""You are an expert on Arduino libraries. For the library "{lib_name}"
used with the "{component}" component, list 2-4 common example sketches and their
functionalities.

For each example, provide:
- The example filename (e.g., "ReadSensor.ino")
- A list of functionalities, each with:
  - "functionality": what the example does (one sentence)
  - "API": list of API function names used

Output as JSON object wrapped in ```json blocks. Example:
```json
{{
    "ReadSensor.ino": {{
        "ReadSensor.ino": [
            {{
                "functionality": "reads sensor data and prints to serial monitor",
                "API": ["begin", "readTemperature", "readHumidity"]
            }}
        ]
    }},
    "AlertExample.ino": {{
        "AlertExample.ino": [
            {{
                "functionality": "triggers alert when temperature exceeds threshold",
                "API": ["begin", "readTemperature", "setAlertLimits"]
            }}
        ]
    }}
}}
```

Generate for {lib_name} ({component}):"""

    resp = llm_request(prompt)
    try:
        return parse_json_response(resp)
    except (json.JSONDecodeError, IndexError) as e:
        logger.error(f"Failed to parse Functionality for {lib_name}: {e}")
        return {}


def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    # Skip components that already have cache (by library name)
    existing = set()
    for f in os.listdir(DATA_DIR):
        if f.endswith("_Header.json"):
            existing.add(f.replace("_Header.json", ""))

    # Deduplicate by library name (SHT40/41/45 share same lib)
    seen_libs = set()
    to_extract = []
    for comp, lib, header in MISSING_COMPONENTS:
        safe = lib.replace(" ", "_")
        if safe in existing:
            logger.info(f"SKIP {comp} ({lib}) - already cached")
            continue
        if safe in seen_libs:
            logger.info(f"SKIP {comp} ({lib}) - same lib already queued")
            continue
        seen_libs.add(safe)
        to_extract.append((comp, lib, header))

    logger.info(f"Need to extract {len(to_extract)} libraries")

    for i, (comp, lib, header) in enumerate(to_extract):
        safe = lib.replace(" ", "_")
        logger.info(f"[{i+1}/{len(to_extract)}] Extracting {lib} for {comp}...")

        # Header
        h_path = os.path.join(DATA_DIR, f"{safe}_Header.json")
        if not os.path.exists(h_path):
            h_data = generate_header_cache(lib, header)
            with open(h_path, "w", encoding="utf-8") as f:
                json.dump(h_data, f, indent=2, ensure_ascii=False)
            logger.info(f"  Header: {len(h_data.get(header, []))} APIs")

        # Example
        e_path = os.path.join(DATA_DIR, f"{safe}_Example.json")
        if not os.path.exists(e_path):
            h_apis = json.load(open(h_path, encoding="utf-8")).get(header, [])
            e_data = generate_example_cache(lib, header, h_apis)
            with open(e_path, "w", encoding="utf-8") as f:
                json.dump(e_data, f, indent=2, ensure_ascii=False)
            logger.info(f"  Example: done")

        # Functionality
        f_path = os.path.join(DATA_DIR, f"{safe}_Functionality.json")
        if not os.path.exists(f_path):
            f_data = generate_functionality_cache(lib, comp)
            with open(f_path, "w", encoding="utf-8") as f:
                json.dump(f_data, f, indent=2, ensure_ascii=False)
            logger.info(f"  Functionality: done")

        logger.info(f"  [{comp}] Complete!")
        time.sleep(0.5)  # rate limiting

    logger.info("=== All extractions complete ===")


if __name__ == "__main__":
    main()
