from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    database_url: str
    cors_origins: List[str] = ["http://localhost:5173"]
    # Researcher passcode for /admin. Empty disables the admin API entirely.
    admin_passcode: str = ""
    # HMAC key for admin tokens. Empty means a random per-process key, so
    # tokens stop working when the server restarts.
    admin_token_secret: str = ""
    admin_token_ttl_seconds: int = 8 * 60 * 60

    # AI phrasing of hints. Without a configured provider the fixed
    # rule-based hint text is used. See services/ai_feedback.py.
    ai_provider: str = "anthropic"          # anthropic | openai (any OpenAI-compatible API)
    ai_api_key: str = ""
    ai_model: str = ""                      # empty = provider default (anthropic: claude-opus-5-5)
    ai_base_url: str = ""                   # openai provider only; empty = https://api.openai.com/v1
    ai_feedback_enabled: bool = True
    ai_feedback_timeout_seconds: float = 6.0
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
