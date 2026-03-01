import requests
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class LLMClient:
    """Configurable LLM client that replaces the old hardcoded send_request_4()."""

    def __init__(self, api_key: str, api_base_url: str = "https://api.openai.com/v1",
                 model: str = "gpt-3.5-turbo"):
        self.api_key = api_key
        self.api_base_url = api_base_url.rstrip("/")
        self.model = model

    def send_request(self, prompt: str) -> str:
        """Send a chat completion request to the LLM API and return the response text."""
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        logger.info(f"LLM request at {current_time}")
        try:
            url = f"{self.api_base_url}/chat/completions"
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            payload = {
                'model': self.model,
                'messages': [{'role': 'user', 'content': prompt}]
            }
            response = requests.post(url, headers=headers, json=payload, timeout=120)
            if response.status_code == 200:
                data = response.json()
                return data['choices'][0]['message']['content']
            else:
                return f'Error: status {response.status_code} - {response.text}'
        except Exception as e:
            logger.error(f"LLM request failed: {e}")
            return f'Error: {e}'
