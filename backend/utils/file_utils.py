import os
import json
import re


def read_tasks_from_json(file_path):
    """Read task definitions from a JSON file and return a flat list of tasks."""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    all_tasks = []
    for component, details in data.items():
        for difficulty, tasks in details['tasks'].items():
            for task in tasks:
                all_tasks.append({
                    "component": component,
                    "description": details["description"],
                    "difficulty": difficulty,
                    "task": task["task"],
                    "components": task["components"]
                })

    return all_tasks


def find_header_files(library_name, libraries_dir):
    """Find all .h files in the given library directory.

    Args:
        library_name: Name of the Arduino library.
        libraries_dir: Absolute path to the Arduino libraries directory.
    """
    library_name_r = library_name.replace(" ", "_")
    library_path = os.path.join(libraries_dir, library_name_r)
    header_files = []

    for root, dirs, files in os.walk(library_path):
        for file in files:
            if file.endswith(".h"):
                header_files.append(os.path.join(root, file))

    return header_files


def read_header_file_content(file_path):
    """Read the content of a header file, handling encoding issues."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except UnicodeDecodeError:
        # Try an alternative encoding
        with open(file_path, 'r', encoding='ISO-8859-1') as file:
            return file.read()


def remove_comments(code):
    """Remove single-line (//) and multi-line (/* */) comments from code."""
    pattern = r"//.*?$|/\*.*?\*/"
    cleaned_code = re.sub(pattern, '', code, flags=re.DOTALL | re.MULTILINE)
    return cleaned_code


def find_ino_files(library_name, libraries_dir):
    """Find all .ino files in the given library directory.

    Args:
        library_name: Name of the Arduino library.
        libraries_dir: Absolute path to the Arduino libraries directory.
    """
    library_name_r = library_name.replace(" ", "_")
    library_path = os.path.join(libraries_dir, library_name_r)
    ino_files = []

    for root, dirs, files in os.walk(library_path):
        for file in files:
            if file.endswith(".ino"):
                ino_files.append(os.path.join(root, file))

    return ino_files


def read_ino_file_content(file_path):
    """Read the content of an .ino sketch file, handling encoding issues."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except UnicodeDecodeError:
        with open(file_path, 'r', encoding='ISO-8859-1') as file:
            return file.read()
