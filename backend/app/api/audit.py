from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from app.database import get_db
from app.models import (
    Pipeline,
    PipelineRun,
    Failure,
    ContractViolation,
    RecoveryRun,
    AuditLog,
    PipelineMetric
)
from app.schemas import AuditLogResponse, DashboardSummaryResponse

router = APIRouter(tags=["Audit & Dashboard"])

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(limit: int = 100, db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_pipelines = db.query(func.count(Pipeline.id)).scalar() or 0
    total_runs = db.query(func.count(PipelineRun.id)).scalar() or 0
    successful_runs = db.query(func.count(PipelineRun.id)).filter(PipelineRun.status == "SUCCESS").scalar() or 0
    failed_runs = db.query(func.count(PipelineRun.id)).filter(PipelineRun.status == "FAILED").scalar() or 0
    contract_violations = db.query(func.count(ContractViolation.id)).scalar() or 0
    active_recoveries = db.query(func.count(RecoveryRun.id)).filter(RecoveryRun.status == "RUNNING").scalar() or 0
    
    avg_rec_time = db.query(func.avg(RecoveryRun.duration_seconds)).filter(RecoveryRun.status == "SUCCESS").scalar() or 0.0
    total_cost = db.query(func.sum(PipelineRun.cost)).scalar() or 0.0

    # Status distribution
    runs_by_status = db.query(PipelineRun.status, func.count(PipelineRun.id)).group_by(PipelineRun.status).all()
    status_dist = {status: count for status, count in runs_by_status}

    # Failure distribution
    failures_by_type = db.query(Failure.failure_type, func.count(Failure.id)).group_by(Failure.failure_type).all()
    failure_dist = {ft: count for ft, count in failures_by_type}

    # Cost trend (last 10 runs)
    recent_runs = db.query(PipelineRun).order_by(PipelineRun.created_at.asc()).limit(15).all()
    cost_trend = [
        {"run_id": r.id[:8], "cost": round(r.cost, 4), "duration": round(r.duration_seconds, 3), "status": r.status}
        for r in recent_runs
    ]

    # Recovery time trend
    recent_recoveries = db.query(RecoveryRun).order_by(RecoveryRun.created_at.asc()).limit(15).all()
    recovery_trend = [
        {"recovery_id": rec.id[:8], "duration": round(rec.duration_seconds, 3), "status": rec.status}
        for rec in recent_recoveries
    ]

    return DashboardSummaryResponse(
        total_pipelines=total_pipelines,
        total_runs=total_runs,
        successful_runs=successful_runs,
        failed_runs=failed_runs,
        contract_violations=contract_violations,
        active_recoveries=active_recoveries,
        avg_recovery_time_seconds=round(float(avg_rec_time), 3),
        total_processing_cost=round(float(total_cost), 4),
        run_status_distribution=status_dist,
        failure_type_distribution=failure_dist,
        cost_trend=cost_trend,
        recovery_time_trend=recovery_trend
    )
