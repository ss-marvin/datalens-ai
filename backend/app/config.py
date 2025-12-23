from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Configuration
    app_name: str = "DataLens AI"
    debug: bool = False
    api_prefix: str = "/api"
    
    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # File Upload
    max_file_size_mb: int = 50
    allowed_extensions: list[str] = [".csv", ".xlsx", ".xls", ".json", ".parquet", ".tsv"]
    upload_dir: str = "uploads"
    
    # AI Configuration
    anthropic_api_key: str = ""
    ai_model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 4096
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
