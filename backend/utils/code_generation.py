import os
import subprocess
import json
import re
import serial
import time
import logging

logger = logging.getLogger(__name__)


def generate_embedded_code_with_gpt4(llm_client, component_name, board_name, pin_connections,
                                     task_description, Library_name, matched_apis):
    """Generate Arduino sketch code using the LLM.

    Args:
        llm_client: An LLMClient instance.
        component_name: Hardware component name.
        board_name: Development board name.
        pin_connections: Pin connection descriptions.
        task_description: Task to implement.
        Library_name: Arduino library name.
        matched_apis: Dict of matched API information.
    """
    prompt = f"""
    You are an expert in embedded systems programming. Your task is to generate the complete embedded C/C++ code for an Arduino platform. The provided information includes the component, the development board name, the pin connections, and the specific task to be performed.

    Component: {component_name}
    Library: {Library_name}
    Development Board: {board_name}
    Pin Connections: {pin_connections}
    Task: {task_description}

    The following Header file and APIs are available and relevant for this task:
    {json.dumps(matched_apis, indent=4)}

    Rules for the coding:
    1. Write as many DEBUG INFO print commands as you can to help debug.
    2. DEBUG INFO will be used to detect the execution state of tasks. It should show the beginning, ending, timing, and order of each task.
    3. Do not output any text other than the complete embedded C/C++ code.
    4. Use only the provided API functions from the given library for the component. Do not invent any header or APIs that are not listed.
    5. Please be reminded that some sensors do not have begin() function, please check it in the provided API list.

    Example output:
    ```cpp
    #include <'Library_name'.h>

    'initialization_code'

    void setup() {{
        Serial.begin(9600);
        'setup_code'
        Serial.println("DEBUG: Setup complete");
    }}

    void loop() {{
        Serial.println("DEBUG: Loop start");
        'loop_code'
        Serial.println("DEBUG: Loop end");
    }}
    Generate the complete Arduino sketch code based on the provided information and rules.
    """
    logger.info(f"Generating code for component: {component_name}")
    response = llm_client.send_request(prompt)

    # Check if the response is complete
    max_retries = 5
    retries = 0

    while retries < max_retries:
        if '```cpp' in response and '```' in response.split('```cpp', 1)[1]:
            break
        else:
            logger.warning(f"Incomplete response received for {component_name}, retrying... (attempt {retries + 1})")
            response = llm_client.send_request(prompt)
            logger.info(f"Updated response: {response}")
            retries += 1
            if '```cpp' in response and '```' in response.split('```cpp', 1)[1]:
                break

    if retries == max_retries:
        logger.warning(f"Max retries reached for {component_name}. The response may still be incomplete.")

    return response


def regenerate_embedded_code_with_feedback(llm_client, component_name, board_name, pin_connections,
                                           task_description, library_name, matched_apis,
                                           feedback, previous_code):
    """Regenerate Arduino code incorporating feedback from a previous attempt.

    Args:
        llm_client: An LLMClient instance.
        component_name: Hardware component name.
        board_name: Development board name.
        pin_connections: Pin connection descriptions.
        task_description: Task to implement.
        library_name: Arduino library name.
        matched_apis: Dict of matched API information.
        feedback: Feedback from the previous attempt.
        previous_code: The previous code that failed.
    """
    prompt = f"""
    You are an expert in embedded systems programming. The previous attempt to generate the Arduino code failed based on the following feedback:

    Feedback:
    {feedback}

    Below is the previous version of the code:
    ```cpp
    {previous_code}
    ```

    Your task is to regenerate the complete embedded C/C++ code for an Arduino platform, considering the provided feedback. The provided information includes the component, the development board name, the pin connections, and the specific task to be performed.

    Component: {component_name}
    Library: {library_name}
    Development Board: {board_name}
    Pin Connections: {pin_connections}
    Task: {task_description}

    The following Header file and APIs are available and relevant for this task:
    {json.dumps(matched_apis, indent=4)}

    Rules for the coding:
    1. Incorporate the feedback to address the issues in the previous code.
    2. Write as many DEBUG INFO print commands as you can to help debug.
    3. DEBUG INFO will be used to detect the execution state of tasks. It should show the beginning, ending, timing, and order of each task.
    4. Do not output any text other than the complete embedded C/C++ code.
    5. Use only the provided API functions from the given library for the component. Do not invent any header or APIs that are not listed.
    6. Please be reminded that some sensors do not have begin() function, please check it in the provided API list.

    Example output:
    ```cpp
    #include <'library_name'.h>

    'code_initialization'

    void setup() {{
        Serial.begin(9600);
        'setup_code'
        Serial.println("DEBUG: Setup complete");
    }}

    void loop() {{
        Serial.println("DEBUG: Loop start");
        'loop_code'
        Serial.println("DEBUG: Loop end");
    }}
    Generate the complete Arduino sketch code based on the provided information and rules.
    """

    response = llm_client.send_request(prompt)

    # Check if the response is complete
    max_retries = 5
    retries = 0

    while retries < max_retries:
        if '```cpp' in response and '```' in response.split('```cpp', 1)[1]:
            break
        else:
            logger.warning(f"Incomplete response received for {component_name}, retrying... (attempt {retries + 1})")
            response = llm_client.send_request(prompt)
            logger.info(f"Updated response: {response}")
            retries += 1
            if '```cpp' in response and '```' in response.split('```cpp', 1)[1]:
                break

    if retries == max_retries:
        logger.warning(f"Max retries reached for {component_name}. The response may still be incomplete.")

    return response


def compile_arduino_code(arduino_cli_path, sketch_path, fqbn):
    """Compile an Arduino sketch using arduino-cli.

    Args:
        arduino_cli_path: Absolute path to the arduino-cli executable.
        sketch_path: Path to the sketch directory or file.
        fqbn: Fully Qualified Board Name (e.g. 'arduino:avr:uno').
    """
    command = [
        arduino_cli_path,
        'compile',
        '--fqbn', fqbn,
        sketch_path
    ]

    result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8')

    return result.stdout, result.stderr, result.returncode


def install_missing_library(arduino_cli_path, library_name):
    """Install an Arduino library using arduino-cli.

    Args:
        arduino_cli_path: Absolute path to the arduino-cli executable.
        library_name: Name of the library to install.
    """
    command = [arduino_cli_path, 'lib', 'install', library_name]

    result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8')

    if result.returncode != 0:
        logger.error(f"Error installing library {library_name}:")
        logger.error(result.stderr)
        return False

    logger.info(f"Library {library_name} installed successfully.")
    return True


def resolve_compilation_errors(llm_client, arduino_cli_path, sketch_path, fqbn,
                               component_name, board_name, pin_connections,
                               task_description, matched_apis, error_log):
    """Use the LLM to fix compilation errors in Arduino code.

    Args:
        llm_client: An LLMClient instance.
        arduino_cli_path: Absolute path to the arduino-cli executable.
        sketch_path: Path to the sketch directory.
        fqbn: Fully Qualified Board Name.
        component_name: Hardware component name.
        board_name: Development board name.
        pin_connections: Pin connection descriptions.
        task_description: Task description.
        matched_apis: Dict of matched API information.
        error_log: Compilation error log.
    """
    prompt = f"""
You are an expert in embedded systems programming. The following Arduino sketch code is failing to compile. The provided information includes the component, the development board name, the pin connections, and the specific task to be performed.

Component: {component_name}
Development Board: {board_name}
Pin Connections: {pin_connections}
Task: {task_description}

The following library and APIs are available and relevant for this task:
{json.dumps(matched_apis, indent=4)}

Compilation Error:
{error_log}

Rules for the correction:
    1. Write as many DEBUG INFO print commands as you can to help debug.
    2. DEBUG INFO will be used to detect the execution state of tasks. It should show the beginning, ending, timing, and order of each task.
    3. Do not output any text other than the complete embedded C/C++ code.
    4. Check if use only the provided API functions from the given library for the component.

Please provide a corrected version of the Arduino sketch code that fixes the above compilation error.

Example output:
```cpp
#include <'Library_name'.h>

'initialization_code'

void setup() {{
    Serial.begin(9600);
    'setup_code'
    Serial.println("DEBUG: Setup complete");
}}

void loop() {{
    Serial.println("DEBUG: Loop start");
    'loop_code'
    Serial.println("DEBUG: Loop end");
}}
Generate the corrected Arduino sketch code based on the provided information and rules.
"""

    response = llm_client.send_request(prompt)

    # Check if the response is complete
    max_retries = 5
    retries = 0

    while retries < max_retries:
        if '```cpp' in response and '```' in response.split('```cpp', 1)[1]:
            break
        else:
            logger.warning(f"Incomplete response received for {component_name}, retrying... (attempt {retries + 1})")
            response = llm_client.send_request(prompt)
            logger.info(f"Updated response: {response}")
            retries += 1
            if '```cpp' in response and '```' in response.split('```cpp', 1)[1]:
                break

    if retries == max_retries:
        logger.warning(f"Max retries reached for {component_name}. The response may still be incomplete.")

    cleaned_code = re.search(r'```cpp(.*?)```', response, re.DOTALL).group(1).strip()
    logger.info(f"Corrected code:\n{cleaned_code}")

    # Save the corrected code to a file
    code_file_path = os.path.join(sketch_path, 'sketch_jul22a.ino')
    with open(code_file_path, 'w', encoding='utf-8') as f:
        f.write(cleaned_code)


def read_serial_output(port, baudrate=9600, timeout=10, max_duration=7, max_lines=50):
    """Read output from Arduino serial port.

    Args:
        port: Serial port name (e.g. '/dev/ttyUSB0' or 'COM6').
        baudrate: Baud rate for serial communication.
        timeout: Read timeout in seconds.
        max_duration: Maximum duration to read in seconds.
        max_lines: Maximum number of lines to read.
    """
    ser = serial.Serial(port, baudrate, timeout=timeout)
    output = []
    start_time = time.time()
    line_count = 0

    while True:
        line = ser.readline().decode('utf-8').strip()

        if line:
            logger.info(line)
            output.append(line)
            line_count += 1

        if line_count >= max_lines or (time.time() - start_time) >= max_duration:
            break

    ser.close()
    return output
