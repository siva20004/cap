from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Schedule, BackfillPlan
from app.schemas import ScheduleGenerateRequest, ScheduleResponse
from app.scheduler.scheduler import CostAwareScheduler

router = APIRouter(prefix="/schedules", tags=["Cost-Aware Scheduler"])

@router.post("/generate", response_model=List[ScheduleResponse], status_code=status.HTTP_201_CREATED)
def generate_schedule_plans(payload: ScheduleGenerateRequest, db: Session = Depends(get_db)):
    scheduler = CostAwareScheduler(db)
    try:
        schedules = scheduler.generate_schedules(
            plan_id=payload.plan_id,
            alpha_cost=payload.alpha_cost_weight,
            beta_time=payload.beta_time_weight,
            gamma_sla=payload.gamma_sla_weight,
            sla_max_seconds=payload.sla_max_seconds or 300.0
        )
        return schedules
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(schedule_id: str, db: Session = Depends(get_db)):
    s = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Schedule '{schedule_id}' not found.")
    return s

@router.get("/by-plan/{plan_id}", response_model=List[ScheduleResponse])
def get_schedules_for_plan(plan_id: str, db: Session = Depends(get_db)):
    return db.query(Schedule).filter(Schedule.plan_id == plan_id).order_by(Schedule.objective_score.asc()).all()
