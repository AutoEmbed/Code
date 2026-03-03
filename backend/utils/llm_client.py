"""Lightweight OpenAI-compatible LLM client."""

import time
import logging
from openai import OpenAI

logger = logging.getLogger(__name__)


class LLMClient:
    def __init__(self, api_key: str, api_base_url: str, model: str):
        self.client = OpenAI(api_key=api_key, base_url=api_base_url)
        self.model = model

    def send_request(
        self,
        prompt: str,
        system_prompt: str = "You are a helpful assistant.",
        max_retries: int = 3,
        timeout: int = 120,
    ) -> str:
        """Send a chat completion request with retry and exponential backoff.

        Args:
            prompt: The user message content.
            system_prompt: The system message content.
            max_retries: Number of attempts before giving up.
            timeout: Request timeout in seconds.

        Returns:
            The assistant's response text.

        Raises:
            RuntimeError: If all retry attempts fail.
        """
        last_error = None
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    timeout=timeout,
                )
                return response.choices[0].message.content
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    wait = 2 ** (attempt + 1)  # 2s, 4s, 8s
                    logger.warning(
                        f"LLM request failed (attempt {attempt + 1}/{max_retries}), "
                        f"retrying in {wait}s: {e}"
                    )
                    time.sleep(wait)
        raise RuntimeError(f"LLM request failed after {max_retries} attempts: {last_error}")
