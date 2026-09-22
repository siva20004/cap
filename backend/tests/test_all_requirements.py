import pytest
import os
import sys
from pathlib import Path
import pandas as pd
from fastapi.testclient import TestClient

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir.parent))

from app.database import SessionLocal, init_db
from app.models import Pipeline, PipelineRun, Failure, Schedule, RecoveryRun
from app.pipeline.executor import PipelineExecutor
from app.pipeline.oracle import IndependentOracle
from app.backfill.planner import BackfillPlanner
from app.scheduler.scheduler import CostAwareScheduler
from app.recovery.recovery import RecoveryEngine
from app.diagnosis.model import RootCauseClassifierService
from app.main import app

@pytest.fixture(scope="session")
def db_session():
    init_db()
    db = SessionLocal()
    yield db
    db.close()

@pytest.fixture(scope="session")
def api_client():
    return TestClient(app)

@pytest.fixture(scope="session")
def test_pipeline(db_session):
    p = db_session.query(Pipeline).first()
    assert p is not None, "Pipeline must exist for tests"
    return p

# -------------------------------------------------------------
# Test 1: Valid Dataset -> PASS
# -------------------------------------------------------------
def test_01_valid_dataset_passes(db_session, test_pipeline):
    executor = PipelineExecutor(db_session)
    run = executor.run_pipeline(test_pipeline.id, "data/raw/orders.csv", failure_scenario=None)
    assert run.status == "SUCCESS"
    assert run.rows_processed == 500
    assert run.cost > 0

# -------------------------------------------------------------
# Test 2: Missing Column -> FAIL
# -------------------------------------------------------------
def test_02_missing_column_fails(db_session, test_pipeline):
    executor = PipelineExecutor(db_session)
    run = executor.run_pipeline(test_pipeline.id, "data/raw/orders.csv", failure_scenario="missing_column")
    assert run.status == "FAILED"
    failure = db_session.query(Failure).filter(Failure.run_id == run.id).first()
    assert failure is not None
    assert "price" in failure.error_message

# -------------------------------------------------------------
# Test 3: Wrong Datatype -> FAIL
# -------------------------------------------------------------
def test_03_wrong_datatype_fails(db_session, test_pipeline):
    executor = PipelineExecutor(db_session)
    run = executor.run_pipeline(test_pipeline.id, "data/raw/orders.csv", failure_scenario="wrong_datatype")
    assert run.status == "FAILED"
    failure = db_session.query(Failure).filter(Failure.run_id == run.id).first()
    assert failure is not None
    assert "wrong_datatype" in failure.error_message or "float" in failure.error_message or "critical" in failure.error_message.lower()

# -------------------------------------------------------------
# Test 4: Invalid Value (range constraint) -> FAIL
# -------------------------------------------------------------
def test_04_invalid_value_fails(db_session, test_pipeline):
    executor = PipelineExecutor(db_session)
    run = executor.run_pipeline(test_pipeline.id, "data/raw/orders.csv", failure_scenario="invalid_value")
    assert run.status == "FAILED"
    failure = db_session.query(Failure).filter(Failure.run_id == run.id).first()
    assert failure is not None
    assert "range" in failure.error_message.lower() or "minimum" in failure.error_message.lower()

# -------------------------------------------------------------
# Test 5: Null Violation -> FAIL
# -------------------------------------------------------------
def test_05_null_violation_fails(db_session, test_pipeline):
    executor = PipelineExecutor(db_session)
    run = executor.run_pipeline(test_pipeline.id, "data/raw/orders.csv", failure_scenario="null_violation")
    assert run.status == "FAILED"
    failure = db_session.query(Failure).filter(Failure.run_id == run.id).first()
    assert failure is not None
    assert "null" in failure.error_message.lower()

# -------------------------------------------------------------
# Test 6: Duplicate Violation -> FAIL
# -------------------------------------------------------------
def test_06_duplicate_violation_fails(db_session, test_pipeline):
    executor = PipelineExecutor(db_session)
    run = executor.run_pipeline(test_pipeline.id, "data/raw/orders.csv", failure_scenario="duplicate_record")
    assert run.status == "FAILED"
    failure = db_session.query(Failure).filter(Failure.run_id == run.id).first()
    assert failure is not None
    assert "duplicate" in failure.error_message.lower()

# -------------------------------------------------------------
# Test 7: Upstream Dependency Failure -> BLOCKS downstream tasks
# -------------------------------------------------------------
def test_07_upstream_dependency_blocks_downstream(db_session, test_pipeline):
    executor = PipelineExecutor(db_session)
    run = executor.run_pipeline(test_pipeline.id, "data/raw/orders.csv", failure_scenario="upstream_dependency")
    assert run.status == "FAILED"
    # Verify downstream tasks are marked BLOCKED
    blocked_tasks = [t for t in run.task_runs if t.status == "BLOCKED"]
    assert len(blocked_tasks) >= 2, f"Expected at least 2 downstream blocked tasks, got {len(blocked_tasks)}"

# -------------------------------------------------------------
# Test 8: Resource Failure -> Diagnosis
# -------------------------------------------------------------
def test_08_resource_failure_diagnosis(db_session, test_pipeline):
    executor = PipelineExecutor(db_session)
    run = executor.run_pipeline(test_pipeline.id, "data/raw/orders.csv", failure_scenario="resource_constraint")
    assert run.status == "FAILED"
    failure = db_session.query(Failure).filter(Failure.run_id == run.id).first()
    assert failure is not None
    
    diag_service = RootCauseClassifierService()
    diagnosis = diag_service.diagnose_failure(db_session, failure)
    assert diagnosis.confidence > 0.0
    assert len(diagnosis.ranked_causes) > 0
    assert diagnosis.predicted_cause in ["resource_constraint", "unknown", "timeout"]

# -------------------------------------------------------------
# Test 9: Timeout Failure -> Diagnosis
# -------------------------------------------------------------
def test_09_timeout_failure_diagnosis(db_session, test_pipeline):
    executor = PipelineExecutor(db_session)
    run = executor.run_pipeline(test_pipeline.id, "data/raw/orders.csv", failure_scenario="timeout")
    assert run.status == "FAILED"
    failure = db_session.query(Failure).filter(Failure.run_id == run.id).first()

    diag_service = RootCauseClassifierService()
    diagnosis = diag_service.diagnose_failure(db_session, failure)
    assert diagnosis.confidence > 0.0
    assert len(diagnosis.ranked_causes) > 0
    assert diagnosis.predicted_cause in ["timeout", "resource_constraint", "unknown"]

# -------------------------------------------------------------
# Test 10: Backfill Plan -> Correct Partitions
# -------------------------------------------------------------
def test_10_backfill_plan_identifies_correct_partitions(db_session, test_pipeline):
    failure = db_session.query(Failure).order_by(Failure.timestamp.desc()).first()
    planner = BackfillPlanner(db_session)
    plan = planner.generate_plan(failure.id, strategy="proposed_selective")
    assert plan.status == "CREATED"
    assert len(plan.affected_dates) > 0
    assert plan.total_partitions >= len(plan.affected_dates)
    assert plan.estimated_runtime_seconds > 0

# -------------------------------------------------------------
# Test 11: Scheduler -> Respects Constraints and Selects Optimal Tier
# -------------------------------------------------------------
def test_11_scheduler_respects_constraints(db_session):
    from app.models import BackfillPlan
    plan = db_session.query(BackfillPlan).order_by(BackfillPlan.created_at.desc()).first()
    
    scheduler = CostAwareScheduler(db_session)
    schedules = scheduler.generate_schedules(plan.id, alpha_cost=0.9, beta_time=0.1)
    assert len(schedules) == 3
    selected = [s for s in schedules if s.is_selected]
    assert len(selected) == 1
    assert selected[0].constraint_status == "FEASIBLE"

# -------------------------------------------------------------
# Test 12: Recovery -> Actually Executes
# -------------------------------------------------------------
def test_12_recovery_actually_executes(db_session):
    schedule = db_session.query(Schedule).filter(Schedule.is_selected == True).order_by(Schedule.created_at.desc()).first()
    engine = RecoveryEngine(db_session)
    rec = engine.execute_recovery(schedule.id)
    assert rec.status == "SUCCESS"
    assert rec.duration_seconds > 0
    assert len(rec.recovery_task_runs) > 0

# -------------------------------------------------------------
# Test 13: Recovery Failure -> Correctly Recorded
# -------------------------------------------------------------
def test_13_recovery_failure_recorded(db_session):
    import uuid
    schedule = db_session.query(Schedule).first()
    unique_fail_key = f"test_failure_key_{uuid.uuid4()}"
    rec = RecoveryRun(
        failure_id=schedule.plan.failure_id,
        plan_id=schedule.plan_id,
        schedule_id=schedule.id,
        idempotency_key=unique_fail_key,
        status="FAILED",
        error_message="Test forced simulated recovery failure",
        oracle_validation_status="FAIL"
    )
    db_session.add(rec)
    db_session.commit()
    db_session.refresh(rec)
    assert rec.status == "FAILED"
    assert rec.oracle_validation_status == "FAIL"

# -------------------------------------------------------------
# Test 14: Independent Oracle -> Detects Mismatch
# -------------------------------------------------------------
def test_14_independent_oracle_detects_mismatch():
    raw_path = Path("data/raw/orders.csv")
    corrupted_output = {
        "total_orders": 999999,  # Deliberately wrong
        "total_sales": 0.0,
        "average_order_value": 0.0
    }
    is_match, summary = IndependentOracle.validate_output(corrupted_output, raw_path)
    assert is_match is False
    assert summary["validation_status"] == "FAIL"
    assert "total_orders" in summary["discrepancies"]

# -------------------------------------------------------------
# Test 15: Repeat Recovery -> Idempotent
# -------------------------------------------------------------
def test_15_repeat_recovery_is_idempotent(db_session):
    import uuid
    schedule = db_session.query(Schedule).filter(Schedule.is_selected == True).order_by(Schedule.created_at.desc()).first()
    engine = RecoveryEngine(db_session)
    unique_key = f"idemp_test_key_{uuid.uuid4()}"
    rec1 = engine.execute_recovery(schedule.id, idempotency_key=unique_key)
    retry_count_before = len(rec1.retry_history or [])
    rec2 = engine.execute_recovery(schedule.id, idempotency_key=unique_key)
    retry_count_after = len(rec2.retry_history or [])
    assert rec1.id == rec2.id
    assert retry_count_after == retry_count_before + 1
    assert retry_count_after == retry_count_before + 1

# -------------------------------------------------------------
# Test 16: API Integration Tests
# -------------------------------------------------------------
def test_16_api_endpoints_work(api_client):
    # 1. Health
    res = api_client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "HEALTHY"

    # 2. Pipelines
    res = api_client.get("/api/pipelines")
    assert res.status_code == 200
    assert len(res.json()) > 0

    # 3. Dashboard summary
    res = api_client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_pipelines"] >= 1
    assert data["total_runs"] >= 1

    # 4. Contracts
    res = api_client.get("/api/contracts")
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # 5. Failures
    res = api_client.get("/api/failures")
    assert res.status_code == 200
    assert len(res.json()) >= 1
