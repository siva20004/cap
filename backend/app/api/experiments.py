from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Experiment
from app.schemas import ExperimentRunRequest, ExperimentResponse
from app.experiments.runner import ExperimentRunner

router = APIRouter(prefix="/experiments", tags=["Research Experiments"])

@router.get("", response_model=List[ExperimentResponse])
def list_experiments(db: Session = Depends(get_db)):
    return db.query(Experiment).order_by(Experiment.created_at.desc()).all()

@router.post("/run", response_model=ExperimentResponse, status_code=status.HTTP_201_CREATED)
def run_experiment(payload: ExperimentRunRequest, db: Session = Depends(get_db)):
    runner = ExperimentRunner(db)
    exp = runner.run_controlled_experiment(
        name=payload.name,
        description=payload.description or "Automated empirical research benchmark",
        scenario=payload.scenario,
        random_seed=payload.random_seed,
        sample_size=payload.sample_size
    )
    return exp

@router.get("/{experiment_id}", response_model=ExperimentResponse)
def get_experiment_details(experiment_id: str, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found.")
    return exp
