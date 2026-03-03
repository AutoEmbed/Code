from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


def vectorize_texts(vectorizer, texts):
    return vectorizer.transform(texts).toarray()


def match_subtasks_with_functionalities(subtasks, functionalities):
    vectorizer = TfidfVectorizer()

    all_texts = subtasks + [func.get('functionality', str(func)) if isinstance(func, dict) else str(func) for file_dict in functionalities.values() for func_list in file_dict.values() for func in func_list]
    vectorizer.fit(all_texts)

    subtask_vectors = vectorize_texts(vectorizer, subtasks)
    functionality_descriptions = [func.get('functionality', str(func)) if isinstance(func, dict) else str(func) for file_dict in functionalities.values() for func_list in file_dict.values() for func in func_list]
    functionality_vectors = vectorize_texts(vectorizer, functionality_descriptions)

    print(f"Subtask vectors shape: {subtask_vectors.shape}")
    print(f"Functionality vectors shape: {functionality_vectors.shape}")

    matches = []
    for i, subtask_vector in enumerate(subtask_vectors):
        similarity_scores = cosine_similarity([subtask_vector], functionality_vectors)[0]
        best_match_index = similarity_scores.argmax()
        best_match_score = similarity_scores[best_match_index]
        matches.append({
            'subtask': subtasks[i],
            'best_match_description': functionality_descriptions[best_match_index],
            'score': best_match_score
        })

    return matches


def strip_line(line):
    return line.strip()


def extract_functionalities(functionalities):
    functionality_list = []
    for ino_file, file_contents in functionalities.items():
        for file_name, functions in file_contents.items():
            for function in functions:
                func_desc = function.get('functionality', '') if isinstance(function, dict) else str(function)
                if func_desc:
                    functionality_list.append(func_desc)
    return functionality_list


def extract_subtasks(subtasks):
    if isinstance(subtasks, dict):
        return subtasks.get('Subtasks', [])
    elif isinstance(subtasks, list):
        return subtasks
    return []


def get_top_n_similarities_and_apis(subtasks, functionalities, functionalities_dict, top_n=1):
    all_texts = subtasks + functionalities

    vectorizer = TfidfVectorizer().fit(all_texts)

    subtask_vectors = vectorizer.transform(subtasks)
    functionality_vectors = vectorizer.transform(functionalities)

    top_similarities_and_apis = []
    api_set = set()

    for i, subtask_vector in enumerate(subtask_vectors):
        similarities = cosine_similarity(subtask_vector, functionality_vectors).flatten()
        top_indices = np.argsort(similarities)[-top_n:][::-1]

        top_funcs = []
        for idx in top_indices:
            functionality = functionalities[idx]
            similarity = similarities[idx]
            for file_dict in functionalities_dict.values():
                for func_list in file_dict.values():
                    for func in func_list:
                        if not isinstance(func, dict):
                            continue
                        if func.get('functionality', '') == functionality:
                            apis = func.get('API', [])
                            top_funcs.append({
                                "functionality": functionality,
                                "similarity": similarity,
                                "APIs": apis
                            })
                            api_set.update(apis)
                            break

        top_similarities_and_apis.append({
            "subtask": subtasks[i],
            "top_functionalities": top_funcs
        })

    return top_similarities_and_apis, api_set


def match_apis(api_set, API_table):
    matched_apis = {}

    for header_file, apis in API_table.items():
        matched_apis[header_file] = []
        for api in apis:
            if api['name'] in api_set:
                matched_apis[header_file].append({
                    "name": api['name'],
                    "description": api.get('description', ''),
                    "parameters": api.get('parameters', []),
                    "practices": api.get('practices', {})
                })

    matched_apis = {k: v for k, v in matched_apis.items() if v}

    return matched_apis
