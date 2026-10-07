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
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
