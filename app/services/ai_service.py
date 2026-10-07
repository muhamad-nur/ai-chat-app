import logging
from typing import AsyncGenerator, List, Dict, Any
from google import genai
from google.genai import types
from google.genai.errors import APIError, ClientError
from app.config import settings

logger = logging.getLogger(__name__)

class AIService:
    """Zero-Cost AI Engine powered by Google Gemini API (google-genai SDK)."""

    def __init__(self, api_key: str = None, model_name: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.MODEL_NAME or "gemini-3.8-flash"
        self._client = None

    @property
    def client(self) -> genai.Client:
        """Lazily initialize client instance."""
        if self._client is None:
            if not self.api_key:
                raise ValueError("GEMINI_API_KEY is not configured.")
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    async def stream_chat(
        self,
        history: List[Dict[str, str]],
        user_prompt: str
    ) -> AsyncGenerator[str, None]:
        """
        Asynchronously streams AI token responses while preserving full multi-turn conversation memory.
        
        Args:
            history: List of previous messages [{'role': 'user'|'assistant', 'content': '...'}]
            user_prompt: Latest message sent by the user
            
        Yields:
            Text chunks in real-time as received from Gemini
        """
        if not self.api_key:
            yield (
                "⚠️ **API Key Missing**: The `GEMINI_API_KEY` environment variable is not set.\n\n"
                "Please configure your free API key in `.env`:\n"
                "```env\n"
                "GEMINI_API_KEY=your_key_here\n"
                "```\n"
                "You can get a 100% free key with no credit card required at [Google AI Studio](https://aistudio.google.com/app/apikey)."
            )
            return

        # Prepare multi-turn contents according to google-genai SDK specification
        contents: List[types.Content] = []
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            content_text = msg.get("content", "").strip()
            if content_text:
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=content_text)]
                    )
                )

        # Append current user prompt
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=user_prompt)]
            )
        )

        system_instruction = (
            "You are an elite, highly intelligent, and polished AI Q&A assistant. "
            "Deliver well-structured, accurate, and insightful answers. "
            "Use clear Markdown formatting with headers, lists, and formatted code blocks "
            "specifying the programming language tag where applicable."
        )

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7,
        )

        candidate_models = [self.model_name]
        for fallback in ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"]:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        last_error = None
        for model in candidate_models:
            try:
                response_stream = await self.client.aio.models.generate_content_stream(
                    model=model,
                    contents=contents,
                    config=config,
                )

                streamed_anything = False
                async for chunk in response_stream:
                    if chunk.text:
                        streamed_anything = True
                        yield chunk.text

                if streamed_anything:
                    return

            except (ClientError, APIError) as e:
                err_str = str(e)
                logger.warning("Model %s encountered error: %s", model, err_str)
                last_error = e

                # If rate limit or quota exceeded
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    yield (
                        "\n\n⚠️ **Rate Limit Exceeded (HTTP 429)**: "
                        "The free-tier rate limit for Google Gemini has been temporarily reached. "
                        "Please wait 10-15 seconds before sending your next message."
                    )
                    return
                # If invalid API key, no need to retry models
                if "API_KEY_INVALID" in err_str or ("400" in err_str and "key" in err_str.lower()):
                    yield (
                        "\n\n⚠️ **Invalid API Key**: Your `GEMINI_API_KEY` appears to be invalid. "
                        "Please verify your key at [Google AI Studio](https://aistudio.google.com/app/apikey)."
                    )
                    return

                # If 503 or 404, try next candidate model in loop
                continue

            except Exception as e:
                logger.warning("Model %s failed with exception: %s", model, e)
                last_error = e
                continue

        # If all candidates failed
        if last_error:
            yield f"\n\n⚠️ **Service Notice:** All AI model endpoints are currently experiencing high traffic ({str(last_error)}). Please try again shortly."

# Singleton AI service instance
ai_service = AIService()

