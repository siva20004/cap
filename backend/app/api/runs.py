from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import PipelineRun
from app.schemas import PipelineRunResponse

router = APIRouter(prefix="/runs", tags=["Pipeline Runs"])

@router.get("", response_model=List[PipelineRunResponse])
def get_pipeline_runs(pipeline_id: Optional[str] = None, status: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(PipelineRun)
    if pipeline_id:
        query = query.filter(PipelineRun.pipeline_id == pipeline_id)
    if status:
        query = query.filter(PipelineRun.status == status)
    return query.order_by(PipelineRun.created_at.desc()).limit(limit).all()

@router.get("/{run_id}", response_model=PipelineRunResponse)
def get_run_details(run_id: str, db: Session = Depends(get_db)):
    run = db.query(PipelineRun).filter(PipelineRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail=f"PipelineRun '{run_id}' not found.")
    return run
