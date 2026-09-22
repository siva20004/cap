from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import BackfillPlan, Failure
from app.schemas import BackfillPlanRequest, BackfillPlanResponse
from app.backfill.planner import BackfillPlanner

router = APIRouter(prefix="/backfill", tags=["Backfill Planner"])

@router.post("/plan", response_model=BackfillPlanResponse, status_code=status.HTTP_201_CREATED)
def create_backfill_plan(payload: BackfillPlanRequest, db: Session = Depends(get_db)):
    planner = BackfillPlanner(db)
    try:
        plan = planner.generate_plan(failure_id=payload.failure_id, strategy=payload.strategy)
        return plan
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{plan_id}", response_model=BackfillPlanResponse)
def get_backfill_plan(plan_id: str, db: Session = Depends(get_db)):
    plan = db.query(BackfillPlan).filter(BackfillPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail=f"Backfill plan '{plan_id}' not found.")
    return plan

@router.get("/by-failure/{failure_id}", response_model=List[BackfillPlanResponse])
def get_plans_for_failure(failure_id: str, db: Session = Depends(get_db)):
    return db.query(BackfillPlan).filter(BackfillPlan.failure_id == failure_id).order_by(BackfillPlan.created_at.desc()).all()
