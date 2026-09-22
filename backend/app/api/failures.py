from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Failure, Pipeline
from app.schemas import FailureResponse, FailureInjectRequest, PipelineRunResponse
from app.pipeline.executor import PipelineExecutor

router = APIRouter(prefix="/failures", tags=["Failures"])

@router.get("", response_model=List[FailureResponse])
def get_failures(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Failure).order_by(Failure.timestamp.desc()).limit(limit).all()

@router.get("/{failure_id}", response_model=FailureResponse)
def get_failure_detail(failure_id: str, db: Session = Depends(get_db)):
    f = db.query(Failure).filter(Failure.id == failure_id).first()
    if not f:
        raise HTTPException(status_code=404, detail=f"Failure '{failure_id}' not found.")
    return f

@router.post("/inject", response_model=PipelineRunResponse)
def inject_failure_scenario(payload: FailureInjectRequest, db: Session = Depends(get_db)):
    pipeline = db.query(Pipeline).filter(Pipeline.id == payload.pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Pipeline '{payload.pipeline_id}' not found.")

    executor = PipelineExecutor(db)
    run = executor.run_pipeline(
        pipeline_id=payload.pipeline_id,
        input_dataset_path="data/raw/orders.csv",
        failure_scenario=payload.scenario,
        run_type="MANUAL_FAILURE_INJECTION"
    )
    return run
