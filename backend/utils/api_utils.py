import subprocess
import os
import logging
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

logger = logging.getLogger(__name__)


def search_arduino_library(arduino_cli_path, library_name, n=5):
    """Search for Arduino libraries using arduino-cli.

    Args:
        arduino_cli_path: Absolute path to the arduino-cli executable.
        library_name: Name or keyword to search for.
        n: Maximum number of results to return.
    """
    full_search_query = f"{library_name}"
    result = subprocess.run(
        [arduino_cli_path, 'lib', 'search', full_search_query],
        capture_output=True, text=True, encoding='utf-8'
    )

    if result.returncode != 0:
        logger.error("Error running Arduino CLI command")
        logger.error(result.stderr)
        return None

    raw_output = result.stdout
    lines = raw_output.split('\n')
    libraries = []
    current_library = {}

    for line in lines:
        line = line.strip()
        if not line:
            if current_library:
                libraries.append(current_library)
                current_library = {}
        elif line.startswith('Name:'):
            if current_library:
                libraries.append(current_library)
                current_library = {}
            current_library['Name'] = line[len('Name:'):].strip().strip('"')
        else:
            if ': ' in line:
                key, value = line.split(': ', 1)
                current_library[key.strip()] = value.strip()

    if current_library:
        libraries.append(current_library)

    return libraries[:n]


def get_match_score(text, component_name):
    """Compute TF-IDF cosine similarity between two strings."""
    vectorizer = TfidfVectorizer().fit_transform([text, component_name])
    vectors = vectorizer.toarray()
    return cosine_similarity(vectors)[0, 1]


def get_name_match_score(lib, component_name):
    """Compute a weighted match score based on library name, sentence, and paragraph."""
    lib_name_score = get_match_score(lib['Name'], component_name)
    lib_sentence_score = get_match_score(lib.get('Sentence', ''), component_name)
    lib_paragraph_score = get_match_score(lib.get('Paragraph', ''), component_name)

    total_score = (lib_name_score + 0.2 * lib_sentence_score + 0.3 * lib_paragraph_score) / 3
    return total_score


def get_versions_count(lib):
    """Count the number of versions available for a library."""
    versions = lib.get('Versions', '')
    if versions:
        return len(versions.split(','))
    return 0


def get_architecture_score(lib_architecture, target_architecture):
    """Score a library based on architecture compatibility."""
    if lib_architecture == '*':
        return 1.0
    return 1.0 if target_architecture in lib_architecture.split(',') else 0.0


def evaluate_library(lib, component_name, max_versions_count, target_architecture):
    """Evaluate a library and return a dict of scores, or None if incompatible."""
    name_match_score = get_name_match_score(lib, component_name)
    versions_count = get_versions_count(lib)
    versions_count_score = versions_count / max_versions_count if max_versions_count > 0 else 0
    architecture_score = get_architecture_score(lib.get('Architecture', ''), target_architecture)

    if architecture_score == 0:
        return None

    return {
        'name_match_score': name_match_score,
        'versions_count_score': 0.01 * versions_count_score,
        'architecture_score': 0.1 * architecture_score,
        'total_score': name_match_score + 0.01 * versions_count_score + 0.1 * architecture_score
    }


def find_best_library_for_component(arduino_cli_path, target_architecture, component_name, top_n=5):
    """Search and rank Arduino libraries for a given component.

    Args:
        arduino_cli_path: Absolute path to the arduino-cli executable.
        target_architecture: Target architecture string (e.g. 'avr').
        component_name: Component to find a library for.
        top_n: Number of candidates to evaluate.
    """
    libraries = search_arduino_library(arduino_cli_path, component_name)
    logger.info(f"Search results for '{component_name}': {libraries}")
    if not libraries:
        return None

    libraries = [lib for lib in libraries if 'Name' in lib]

    if not libraries:
        return None

    libraries = sorted(libraries, key=lambda lib: lib['Name'])[:top_n]
    max_versions_count = max(get_versions_count(lib) for lib in libraries)
    evaluated_libraries = []

    for lib in libraries:
        scores = evaluate_library(lib, component_name, max_versions_count, target_architecture)
        if scores:
            evaluated_libraries.append((lib, scores))

    if not evaluated_libraries:
        return None
    best_library = max(evaluated_libraries, key=lambda item: item[1]['total_score'])
    return best_library


def download_library(arduino_cli_path, libraries_dir, library_name):
    """Download an Arduino library and return the folder name of the newly installed library.

    Args:
        arduino_cli_path: Absolute path to the arduino-cli executable.
        libraries_dir: Absolute path to the Arduino libraries directory.
        library_name: Name of the library to install.
    """
    before_download = set(os.listdir(libraries_dir))

    result = subprocess.run(
        [arduino_cli_path, 'lib', 'install', library_name],
        capture_output=True, text=True, encoding='utf-8'
    )
    if result.returncode != 0:
        logger.error(f"Error downloading library {library_name}")
        logger.error(result.stderr)
        return None
    logger.info(f"Library {library_name} downloaded successfully.")

    after_download = set(os.listdir(libraries_dir))

    new_folders = after_download - before_download
    if new_folders:
        actual_folder_name = new_folders.pop()
        return actual_folder_name
    else:
        logger.warning("No new folder detected. Library might not have been downloaded correctly.")
        return None
