import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env explicitly from root directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
        HOST: str = os.getenv("HOST", "0.0.0.0")
        PORT: int = int(os.getenv("PORT", "8000"))
        MODEL_NAME: str = os.getenv("MODEL_NAME", "gemini-3.5-flash-lite")
        DATABASE_URL: str = "sqlite:///./chat.db"

        model_config = SettingsConfigDict(
            env_file=str(env_path),
            env_file_encoding="utf-8",
            extra="ignore",
        )

    settings = Settings()
except Exception:
    class FallbackSettings:
        def __init__(self):
            self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
            self.HOST = os.getenv("HOST", "0.0.0.0")
            self.PORT = int(os.getenv("PORT", "8000"))
            self.MODEL_NAME = os.getenv("MODEL_NAME", "gemini-3.5-flash-lite")
            self.DATABASE_URL = "sqlite:///./chat.db"

    settings = FallbackSettings()

