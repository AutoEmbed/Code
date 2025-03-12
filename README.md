## Overview
This project automates the process of generating, compiling, and uploading Embed system code based on tasks defined in a JSON file. It leverages the Arduino CLI for library management and compilation, and uses LLMs to process library headers, examples, and generate code tailored to specific components and tasks. The project is designed to simplify the development process for IoT projects by automating repetitive tasks and ensuring compatibility with the specified hardware and libraries.

## Prerequisites
Before setting up the project, ensure you have the following installed:
- **Arduino CLI (version 0.20.2 or higher)**: Follow the [official installation guide](https://arduino.github.io/arduino-cli/latest/installation/)
- **Required Python packages**:
  - `requests`
  - `scikit-learn`
  - `numpy`
  - `pyserial`

## Setup Instructions
1. **Install Arduino CLI**:
   - Follow the [official Arduino CLI installation guide](https://arduino.github.io/arduino-cli/latest/installation/) for your operating system.
   - After installation, run the following commands to configure the Arduino CLI:
     ```bash
     arduino-cli core update-index
     arduino-cli core install arduino:avr  # Install the core for Arduino Uno; adjust for other boards

2. **Install Required Python Packages**:
    - Use `pip` to install the necessary Python libraries

3. **Add Your LLM API Key:**
    - Open the `api_utils.py` file located in the `utils/` directory.
    - Find the `send_request_4` function and replace `'your_openai_api_key_here'` with your actual API key:
    `api_key = 'your_openai_api_key_here'  # Replace with your actual API key`

    - Note: If you’re using a different LLM service (e.g., not OpenAI), you may need to modify the API endpoint, headers, and payload in the same function to match the service’s requirements.

4. **Configure the Project:**
    - Ensure the `config.py` file in the `utils/` directory has the correct paths and settings for your environment, such as the Arduino CLI path and library directory.

## Project Structure
The project is organized into the following files and directories:

- **`main.py`**: The entry point of the application. It orchestrates the entire process of reading tasks, processing components, generating code, and uploading it to the Arduino board.
- **`utils/`**: Contains utility modules that handle specific functionalities:
  - `api_utils.py`: Manages API interactions and library operations.
  - `file_utils.py`: Handles file reading and processing tasks.
  - `gpt_processing.py`: Interacts with GPT-4 for processing headers, examples, and generating subtasks.
  - `matching_utils.py`: Matches subtasks with library functionalities using similarity measures.
  - `code_generation.py`: Generates, compiles, and validates the code.
  - `config.py`: Stores configuration settings like paths and constants.
- **Subfolders for JSON files**:
  - `Header/`: Stores JSON files containing processed header information.
  - `Example/`: Stores JSON files with processed example code data.
  - `Functionality/`: Stores JSON files with functionality descriptions.
  - `Subtask/`: Stores JSON files with generated subtasks for each component.

## Running the Script

1. **Connect the Embed System Board**:
   - Ensure your embed system board is connected to your computer via USB.
   - Update the `default_port` in `config.py` to match the correct serial port (e.g., `COM6` on Windows or `/dev/ttyUSB0` on Linux).

2. **Prepare the Task JSON File**:
   - Place your task JSON file (e.g., `Embed_tasks.json`) in the project’s root directory.
   - The JSON file should define tasks for specific components. Refer to the **Task JSON Structure** section (not provided here) for details.

3. **Run the Script**:
   - Open a terminal or command prompt in the project’s root directory.
   - Execute the script with:
     `python main.py`
