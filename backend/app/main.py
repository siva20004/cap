import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

# Ensure app package is accessible
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings
from app.database import init_db
from app.api.pipelines import router as pipelines_router
from app.api.runs import router as runs_router
from app.api.contracts import router as contracts_router
from app.api.failures import router as failures_router
from app.api.diagnosis import router as diagnosis_router
from app.api.backfill import router as backfill_router
from app.api.scheduler import router as scheduler_router
from app.api.recovery import router as recovery_router
from app.api.experiments import router as experiments_router
from app.api.models import router as models_router
from app.api.datasets import router as datasets_router
from app.api.audit import router as audit_router
from app.api.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure DB tables and directories
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Research & Engineering platform for self-diagnosing data pipelines with contracts, backfill, and scheduling.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus Instrumentator
instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app, endpoint="/metrics")

# Mount Routers under /api
app.include_router(pipelines_router, prefix=settings.API_V1_STR)
app.include_router(runs_router, prefix=settings.API_V1_STR)
app.include_router(contracts_router, prefix=settings.API_V1_STR)
app.include_router(failures_router, prefix=settings.API_V1_STR)
app.include_router(diagnosis_router, prefix=settings.API_V1_STR)
app.include_router(backfill_router, prefix=settings.API_V1_STR)
app.include_router(scheduler_router, prefix=settings.API_V1_STR)
app.include_router(recovery_router, prefix=settings.API_V1_STR)
app.include_router(experiments_router, prefix=settings.API_V1_STR)
app.include_router(models_router, prefix=settings.API_V1_STR)
app.include_router(datasets_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System"])

def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV
    }
