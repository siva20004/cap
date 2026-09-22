from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Pipeline, PipelineTask, PipelineRun
from app.schemas import (
    PipelineCreate,
    PipelineResponse,
    PipelineRunTrigger,
    PipelineRunResponse
)
from app.pipeline.executor import PipelineExecutor

router = APIRouter(prefix="/pipelines", tags=["Pipelines"])

@router.get("", response_model=List[PipelineResponse])
def get_pipelines(db: Session = Depends(get_db)):
    return db.query(Pipeline).order_by(Pipeline.created_at.desc()).all()

@router.post("", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
def create_pipeline(data: PipelineCreate, db: Session = Depends(get_db)):
    existing = db.query(Pipeline).filter(Pipeline.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Pipeline '{data.name}' already exists.")

    pipeline = Pipeline(
        name=data.name,
        description=data.description,
        schedule_cron=data.schedule_cron,
        status="ACTIVE"
    )
    db.add(pipeline)
    db.flush()

    for t in data.tasks:
        task = PipelineTask(
            pipeline_id=pipeline.id,
            task_name=t.task_name,
            operator_type=t.operator_type,
            upstream_tasks=t.upstream_tasks,
            retry_limit=t.retry_limit,
            timeout_seconds=t.timeout_seconds
        )
        db.add(task)

    db.commit()
    db.refresh(pipeline)
    return pipeline

@router.get("/{pipeline_id}", response_model=PipelineResponse)
def get_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    p = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found.")
    return p

@router.post("/{pipeline_id}/run", response_model=PipelineRunResponse)
def trigger_pipeline_run(pipeline_id: str, payload: PipelineRunTrigger, db: Session = Depends(get_db)):
    p = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found.")

    dataset_file = payload.dataset_file or "data/raw/orders.csv"
    executor = PipelineExecutor(db)
    run = executor.run_pipeline(
        pipeline_id=pipeline_id,
        input_dataset_path=dataset_file,
        contract_version=payload.contract_version or "1.0",
        failure_scenario=payload.failure_scenario,
        run_type=payload.run_type
    )
    return run
