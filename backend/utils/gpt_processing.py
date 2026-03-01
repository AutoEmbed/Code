import json
import re
import logging

logger = logging.getLogger(__name__)


def process_header_with_gpt4(llm_client, header_content, file_name):
    """Extract API information from a header file using the LLM.

    Args:
        llm_client: An LLMClient instance.
        header_content: Content of the header file.
        file_name: Name of the header file (for logging).
    """
    prompt = f"""
    Given the header code of the library, extract API information, including:
    - API Name
    - Description (less than 20 words)
    - Parameters
    - Return Type.

    Ignore constructors, destructors, and operator overloads. Also, skip internal helper functions that are not part of the public API.

    Output the API information in JSON format with the following structure, without any additional words.

    Example:
    [
    {{
        "name": "exampleFunction",
        "description": "concise description",
        "parameters": ['int param1', 'float param2'],
        "return_type": "void"
    }},
    {{
        "name": "anotherFunction",
        "description": "concise description",
        "parameters": ['std::string input'],
        "return_type": "int"
    }}
    ]

    Please generate API information for the following Header Code:
    {header_content}
    """

    response = llm_client.send_request(prompt)

    # Check if the response is complete
    max_retries = 5
    retries = 0

    while retries < max_retries:
        if '```json' in response and '```' in response.split('```json', 1)[1]:
            # Extract the JSON part from the response
            json_block = response.split('```json', 1)[1].split('```', 1)[0].strip()
            try:
                # Attempt to parse the extracted JSON part
                json.loads(json_block)
                response = f"```json\n{json_block}\n```"
                break
            except json.JSONDecodeError:
                # If parsing fails, continue retrying
                logger.warning(f"Extracted JSON block is invalid for {file_name}, retrying... (attempt {retries + 1})")
        else:
            try:
                # Attempt to parse the entire response as JSON directly
                json.loads(response)
                response = f"```json\n{response}\n```"
                break  # If successful, exit the loop
            except json.JSONDecodeError:
                # If not valid JSON, retry
                logger.warning(f"Incomplete response received for {file_name}, retrying... (attempt {retries + 1})")

        # Send another request if the previous steps failed
        response = llm_client.send_request(prompt)
        logger.info(f"Updated response: {response}")
        retries += 1

    if retries == max_retries:
        logger.warning(f"Max retries reached for {file_name}. The response may still be incomplete.")

    return response


def process_ino_with_gpt4(llm_client, ino_content, file_name, api_list, chunk_size=1, sub_chunk_size=10):
    """Extract best practices from .ino example code using the LLM.

    Args:
        llm_client: An LLMClient instance.
        ino_content: Content of the .ino file.
        file_name: Name of the .ino file (for logging).
        api_list: Dict of header -> API list.
        chunk_size: Number of headers to process at once.
        sub_chunk_size: Number of APIs per sub-chunk.
    """
    merged_responses = {}

    for i in range(0, len(api_list), chunk_size):
        api_chunk = {k: api_list[k] for k in list(api_list.keys())[i:i + chunk_size]}

        sub_chunks = []
        for header, apis in api_chunk.items():
            sub_chunks.extend(split_apis(header, apis, sub_chunk_size))

        for sub_chunk in sub_chunks:
            logger.info(f'sub_chunk: {sub_chunk}')
            prompt = f"""
            Please read the APIs and sample code in the following API JSON file, and summarize common issues to avoid and corresponding best practices when using the API. These best practices should cover the following aspects:
            1.API Call Order (should indicate which header is #include, and how to initialize the module), 2.Parameter Usage (should contain a example use instance), and Return Value Handling.

            Example:
            {{
                "xxx.h":[
                {{
                    "name": "",
                    "description": "",
                    "parameters": [],
                    "practices":  {{
                                "API order": "", #(should indicate which header is #include, and how to initialize the module)
                                "parameter usage": "", (should contain an usage example)
                                "return value handling": ""
                        }}
                }}
            ]
            }}
            Incorporate these learned best practices into the original API JSON structure without any additional words. Do not change the original JSON structure. Limited to 20 words each practice.

            API JSON:
            {json.dumps(sub_chunk, indent=4)}

            Arduino Sketch Code:
            {ino_content}
            """

            response = llm_client.send_request(prompt)

            # Check if the response is complete
            max_retries = 5
            retries = 0

            while retries < max_retries:
                if '```json' in response and '```' in response.split('```json', 1)[1]:
                    # Extract the JSON part from the response
                    json_block = response.split('```json', 1)[1].split('```', 1)[0].strip()
                    try:
                        # Parse the extracted JSON part
                        parsed_response = json.loads(json_block)

                        # Merge the parsed response into the main merged_responses
                        for header, apis in parsed_response.items():
                            if header in merged_responses:
                                merged_responses[header].extend(apis)
                            else:
                                merged_responses[header] = apis

                        break
                    except json.JSONDecodeError:
                        logger.warning(f"Extracted JSON block is invalid for {file_name}, retrying... (attempt {retries + 1})")
                else:
                    try:
                        # Attempt to parse the entire response as JSON directly
                        parsed_response = json.loads(response)

                        # Merge the parsed response into the main merged_responses
                        for header, apis in parsed_response.items():
                            if header in merged_responses:
                                merged_responses[header].extend(apis)
                            else:
                                merged_responses[header] = apis

                        break  # If successful, exit the loop
                    except json.JSONDecodeError:
                        logger.warning(f"Incomplete response received for {file_name}, retrying... (attempt {retries + 1})")

                # Send another request if the previous steps failed
                response = llm_client.send_request(prompt)
                logger.info(f"Updated response: {response}")
                retries += 1

            if retries == max_retries:
                logger.warning(f"Max retries reached for {file_name}. The response may still be incomplete.")
                continue

    return merged_responses


def functionality_with_gpt4(llm_client, ino_content, file_name, ComponentName, LibraryName):
    """Extract function calls and functionality summaries from .ino code using the LLM.

    Args:
        llm_client: An LLMClient instance.
        ino_content: Content of the .ino file.
        file_name: Name of the .ino file (for logging).
        ComponentName: Name of the hardware component.
        LibraryName: Name of the Arduino library.
    """
    prompt = f"""
    Please extract all function calls related to the component {ComponentName} with library {LibraryName} from the provided code snippet. List these function calls in the order they appear in the code.
    Follow these steps:
    1. Summarize the functionality of the example.
    2. Identify and list the function calls related to the component, removing any object prefixes.
    3. Do not include parentheses or parameters in the function calls. For example, if it contains setPrecision(PARA), it should be listed as setPrecision.

    Example:
    {{
        "ReadHumidity.ino": [
            {{
                "functionality": "reads humidity data and prints the value to the serial port",
                "API": [
                    "function_call_1",
                    "function_call_2",
                    "function_call_3"
                ]
            }}
        ]
    }}

    Summarize it in JSON structure without any additional words.

    Arduino Sketch Code of file {file_name}:
    {ino_content}
    """
    response = llm_client.send_request(prompt)

    # Check if the response is complete
    max_retries = 5
    retries = 0

    while retries < max_retries:
        if '```json' in response and '```' in response.split('```json', 1)[1]:
            # Extract the JSON part from the response
            json_block = response.split('```json', 1)[1].split('```', 1)[0].strip()
            try:
                # Attempt to parse the extracted JSON part
                json.loads(json_block)
                response = f"```json\n{json_block}\n```"
                break
            except json.JSONDecodeError:
                # If parsing fails, continue retrying
                logger.warning(f"Extracted JSON block is invalid for {file_name}, retrying... (attempt {retries + 1})")
        else:
            try:
                # Attempt to parse the entire response as JSON directly
                json.loads(response)
                response = f"```json\n{response}\n```"
                break  # If successful, exit the loop
            except json.JSONDecodeError:
                # If not valid JSON, retry
                logger.warning(f"Incomplete response received for {file_name}, retrying... (attempt {retries + 1})")

        # Send another request if the previous steps failed
        response = llm_client.send_request(prompt)
        logger.info(f"Updated response: {response}")
        retries += 1

    if retries == max_retries:
        logger.warning(f"Max retries reached for {file_name}. The response may still be incomplete.")
    return response


def generate_subtasks_with_gpt4(llm_client, task, components):
    """Generate subtasks for a given task and component list using the LLM.

    Args:
        llm_client: An LLMClient instance.
        task: Task description string.
        components: List of component names.
    """
    prompt = f"""
Given the task description and the list of components, generate detailed subtasks (functionalities) required to complete the task. Follow these steps:
1. Summarize the main task.
2. List the subtasks in the order they should be completed.

Example:
Task: Measure temperature and log to the console.
Components: ["Temperature Sensor"]

Output:
{{
    "Task": "Measure temperature and log to the console",
    "Subtasks": [
        "Initialize the temperature sensor",
        "Read temperature data from the sensor",
        "Log the temperature data to the console"
    ]
}}

Task: {task}
Components: {components}

Please generate subtasks in the JSON format without any additional words.
"""
    return llm_client.send_request(prompt)


def validate_debug_output_with_gpt(llm_client, output_lines, task_description):
    """Validate Arduino debug output against expected task behavior using the LLM.

    Args:
        llm_client: An LLMClient instance.
        output_lines: Debug output lines from Arduino serial.
        task_description: Description of the task being validated.
    """
    prompt = f"""
Given the following task and debug output from an Arduino, check if the task's execution in the debug output aligns with the expected sequence and timing:

Task Description:
{task_description}

Debug Output:
{output_lines}

Ensure that:
1. Each task is executed.
2. The execution order follows the expected sequence based on the task description.
3. Only focus on the logic, not sensor reading results.
4. If the code works, but miss some debug output, the feedback should indicate only change the debug output, do not change logic.
5. Do not need all scenarios tested and logged, because scenarios sometimes can not be controlled.
6. Logging intervals are ok to be lost or not precise.

If everything is correct, respond with "pass". If discrepancies are found, respond with "feedback: <describe the issues>". Feedback is limited to 20 words.
"""
    response = llm_client.send_request(prompt)

    # Parse the response to determine if it's a pass or feedback
    if "pass" in response.lower():
        return "pass"
    else:
        # Extract feedback
        feedback = response.replace("feedback:", "").strip()
        return f"feedback: {feedback}"


def clean_code_of_debug_info(llm_client, code):
    """Remove DEBUG print statements from Arduino code using the LLM.

    Args:
        llm_client: An LLMClient instance.
        code: Arduino C/C++ code containing debug statements.
    """
    prompt = f"""
The following Arduino C/C++ code contains DEBUG information. Please clean the code by removing all DEBUG information, such as print statements used for debugging and any comments related to debugging, while preserving the functional logic. Return only the cleaned code without any additional explanations.

Here is the code:
```cpp
{code}
"""
    # Send the prompt to LLM and get the response
    response = llm_client.send_request(prompt)
    # Extract and return the cleaned code, ensuring any Markdown code block markers are removed
    cleaned_code_match = re.search(r'```cpp(.*?)```', response, re.DOTALL)

    if cleaned_code_match:
        cleaned_code = cleaned_code_match.group(1).strip()
    else:
        raise ValueError("Failed to extract cleaned code from the LLM response.")

    return cleaned_code


def split_apis(header, apis, sub_chunk_size):
    """Split a list of APIs into sub-chunks of the given size."""
    logger.info(f"Splitting APIs for header: {header}, count: {len(apis)}")
    return [{header: apis[i:i + sub_chunk_size]} for i in range(0, len(apis), sub_chunk_size)]
