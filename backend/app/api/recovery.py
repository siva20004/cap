from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import RecoveryRun, Schedule
from app.schemas import RecoveryExecuteRequest, RecoveryRunResponse
from app.recovery.recovery import RecoveryEngine

router = APIRouter(prefix="/recovery", tags=["Recovery Engine"])

@router.post("/execute", response_model=RecoveryRunResponse, status_code=status.HTTP_201_CREATED)
def execute_recovery_endpoint(payload: RecoveryExecuteRequest, db: Session = Depends(get_db)):
    engine = RecoveryEngine(db)
    try:
        run = engine.execute_recovery(
            schedule_id=payload.schedule_id,
            idempotency_key=payload.idempotency_key
        )
        return run
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recovery execution failed: {str(e)}")

@router.get("/{recovery_id}", response_model=RecoveryRunResponse)
def get_recovery_status(recovery_id: str, db: Session = Depends(get_db)):
    rec = db.query(RecoveryRun).filter(RecoveryRun.id == recovery_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"RecoveryRun '{recovery_id}' not found.")
    return rec

@router.get("", response_model=List[RecoveryRunResponse])
def list_recoveries(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(RecoveryRun).order_by(RecoveryRun.created_at.desc()).limit(limit).all()
