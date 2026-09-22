from pydantic_settings import BaseSettings
from pydantic import Field
import os
from pathlib import Path

# Base directory for the project (capstone website)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Self-Diagnosing AI Pipeline Orchestrator"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5433/capstone_pipeline",
        validation_alias="DATABASE_URL"
    )
    FRONTEND_URL: str = Field(default="http://localhost:5173", validation_alias="FRONTEND_URL")
    BACKEND_URL: str = Field(default="http://localhost:8000", validation_alias="BACKEND_URL")
    MODEL_PATH: str = Field(default=str(PROJECT_ROOT / "ml" / "models"), validation_alias="MODEL_PATH")
    PROMETHEUS_URL: str = Field(default="http://localhost:9090", validation_alias="PROMETHEUS_URL")
    APP_ENV: str = Field(default="development", validation_alias="APP_ENV")
    PORT: int = Field(default=8000, validation_alias="PORT")
    
    # Storage Paths
    DATA_DIR: Path = PROJECT_ROOT / "data"
    RAW_DATA_DIR: Path = PROJECT_ROOT / "data" / "raw"
    PROCESSED_DATA_DIR: Path = PROJECT_ROOT / "data" / "processed"
    CONTRACTS_DIR: Path = PROJECT_ROOT / "data" / "contracts"
    FAILURES_DIR: Path = PROJECT_ROOT / "data" / "failures"
    SYNTHETIC_DIR: Path = PROJECT_ROOT / "data" / "synthetic"
    EXPERIMENTS_DIR: Path = PROJECT_ROOT / "experiments" / "results"
    
    class Config:
        env_file = str(PROJECT_ROOT / ".env")
        extra = "ignore"

settings = Settings()

# Ensure directories exist
for p in [
    settings.DATA_DIR,
    settings.RAW_DATA_DIR,
    settings.PROCESSED_DATA_DIR,
    settings.CONTRACTS_DIR,
    settings.FAILURES_DIR,
    settings.SYNTHETIC_DIR,
    settings.EXPERIMENTS_DIR,
    Path(settings.MODEL_PATH)
]:
    p.mkdir(parents=True, exist_ok=True)
