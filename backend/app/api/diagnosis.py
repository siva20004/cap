from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Failure, Diagnosis
from app.schemas import DiagnosisResponse
from app.diagnosis.model import RootCauseClassifierService

router = APIRouter(prefix="/failures", tags=["AI Diagnosis"])

@router.post("/{failure_id}/diagnose", response_model=DiagnosisResponse)
def diagnose_failure_endpoint(failure_id: str, db: Session = Depends(get_db)):
    failure = db.query(Failure).filter(Failure.id == failure_id).first()
    if not failure:
        raise HTTPException(status_code=404, detail=f"Failure '{failure_id}' not found.")

    service = RootCauseClassifierService()
    diagnosis = service.diagnose_failure(db, failure)
    return diagnosis

@router.get("/{failure_id}/diagnosis", response_model=DiagnosisResponse)
def get_failure_diagnosis(failure_id: str, db: Session = Depends(get_db)):
    diagnosis = db.query(Diagnosis).filter(Diagnosis.failure_id == failure_id).order_by(Diagnosis.timestamp.desc()).first()
    if not diagnosis:
        # Automatically run diagnosis if not yet computed
        failure = db.query(Failure).filter(Failure.id == failure_id).first()
        if not failure:
            raise HTTPException(status_code=404, detail=f"Failure '{failure_id}' not found.")
        service = RootCauseClassifierService()
        diagnosis = service.diagnose_failure(db, failure)
    return diagnosis
