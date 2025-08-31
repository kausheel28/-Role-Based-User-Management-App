# AI-assisted: see ai-assist.md
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database - Using SQLite for development
    database_url: str = "sqlite:///./app.db"
    
    # JWT Settings
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # CORS Settings
    backend_cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # App Settings
    app_name: str = "User Management API"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
