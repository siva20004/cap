import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Pipeline(Base):
    __tablename__ = "pipelines"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    schedule_cron = Column(String(50), nullable=True)
    status = Column(String(30), default="ACTIVE")  # ACTIVE, PAUSED, ARCHIVED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tasks = relationship("PipelineTask", back_populates="pipeline", cascade="all, delete-orphan")
    runs = relationship("PipelineRun", back_populates="pipeline", cascade="all, delete-orphan")


class PipelineTask(Base):
    __tablename__ = "pipeline_tasks"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    pipeline_id = Column(String(36), ForeignKey("pipelines.id"), nullable=False)
    task_name = Column(String(100), nullable=False)
    operator_type = Column(String(50), nullable=False)  # e.g., validate, clean, transform, aggregate, store
    upstream_tasks = Column(JSON, default=list)  # list of task_names this depends on
    retry_limit = Column(Integer, default=0)
    timeout_seconds = Column(Integer, default=300)
    created_at = Column(DateTime, default=datetime.utcnow)

    pipeline = relationship("Pipeline", back_populates="tasks")


class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    table_name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    active_version = Column(String(20), default="1.0")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    versions = relationship("ContractVersion", back_populates="contract", cascade="all, delete-orphan")


class ContractVersion(Base):
    __tablename__ = "contract_versions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    contract_id = Column(String(36), ForeignKey("contracts.id"), nullable=False)
    version_str = Column(String(20), nullable=False)
    schema_definition = Column(JSON, nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="versions")
    violations = relationship("ContractViolation", back_populates="contract_version")


class ContractViolation(Base):
    __tablename__ = "contract_violations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), nullable=True, index=True)
    contract_version_id = Column(String(36), ForeignKey("contract_versions.id"), nullable=False)
    rule_type = Column(String(50), nullable=False)  # missing_column, wrong_datatype, null_violation, range_violation, duplicate_record, schema_mismatch
    column_name = Column(String(100), nullable=True)
    violation_details = Column(Text, nullable=False)
    severity = Column(String(20), default="CRITICAL")  # CRITICAL, WARNING
    invalid_rows_count = Column(Integer, default=1)
    timestamp = Column(DateTime, default=datetime.utcnow)

    contract_version = relationship("ContractVersion", back_populates="violations")


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    pipeline_id = Column(String(36), ForeignKey("pipelines.id"), nullable=False)
    run_type = Column(String(30), default="SCHEDULED")  # SCHEDULED, MANUAL, RECOVERY, EXPERIMENT
    status = Column(String(30), default="PENDING")  # PENDING, RUNNING, SUCCESS, FAILED, BLOCKED
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, default=0.0)
    rows_processed = Column(Integer, default=0)
    input_dataset = Column(String(255), nullable=True)
    contract_version = Column(String(50), nullable=True)
    output_dataset = Column(String(255), nullable=True)
    execution_logs = Column(Text, nullable=True)
    cost = Column(Float, default=0.0)
    resource_metrics = Column(JSON, default=dict)  # avg_cpu, max_memory_mb, throughput
    failure_scenario = Column(String(100), nullable=True)  # injected scenario if any
    created_at = Column(DateTime, default=datetime.utcnow)

    pipeline = relationship("Pipeline", back_populates="runs")
    task_runs = relationship("TaskRun", back_populates="pipeline_run", cascade="all, delete-orphan")
    failures = relationship("Failure", back_populates="pipeline_run", cascade="all, delete-orphan")


class TaskRun(Base):
    __tablename__ = "task_runs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("pipeline_runs.id"), nullable=False)
    task_name = Column(String(100), nullable=False)
    status = Column(String(30), default="PENDING")  # PENDING, RUNNING, SUCCESS, FAILED, BLOCKED, SKIPPED
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, default=0.0)
    cpu_usage_pct = Column(Float, default=0.0)
    memory_mb = Column(Float, default=0.0)
    rows_processed = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    pipeline_run = relationship("PipelineRun", back_populates="task_runs")


class Failure(Base):
    __tablename__ = "failures"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("pipeline_runs.id"), nullable=False)
    pipeline_name = Column(String(100), nullable=False)
    task_name = Column(String(100), nullable=False)
    failure_type = Column(String(100), nullable=False)
    error_message = Column(Text, nullable=False)
    stack_trace = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    relevant_metrics = Column(JSON, default=dict)  # cpu, memory, latency, violation_count
    affected_partitions = Column(JSON, default=list)
    evidence_summary = Column(JSON, default=list)

    pipeline_run = relationship("PipelineRun", back_populates="failures")
    diagnoses = relationship("Diagnosis", back_populates="failure", cascade="all, delete-orphan")
    backfill_plans = relationship("BackfillPlan", back_populates="failure", cascade="all, delete-orphan")


class Diagnosis(Base):
    __tablename__ = "diagnoses"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    failure_id = Column(String(36), ForeignKey("failures.id"), nullable=False)
    model_version = Column(String(50), nullable=False)
    baseline_cause = Column(String(100), nullable=False)
    predicted_cause = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)  # Top-1 probability from actual model
    ranked_causes = Column(JSON, nullable=False)  # [{"cause": str, "probability": float}]
    features = Column(JSON, nullable=False)  # exact feature dictionary passed into model
    evidence = Column(JSON, default=list)  # list of evidence points
    anomaly_status = Column(String(50), default="NORMAL")  # NORMAL, ANOMALOUS (from LSTM)
    anomaly_score = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    failure = relationship("Failure", back_populates="diagnoses")
    evidence_items = relationship("DiagnosisEvidence", back_populates="diagnosis", cascade="all, delete-orphan")


class DiagnosisEvidence(Base):
    __tablename__ = "diagnosis_evidence"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    diagnosis_id = Column(String(36), ForeignKey("diagnoses.id"), nullable=False)
    evidence_type = Column(String(50), nullable=False)
    rule_or_metric = Column(String(100), nullable=False)
    observed_value = Column(Text, nullable=False)
    expected_value = Column(Text, nullable=True)
    description = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    diagnosis = relationship("Diagnosis", back_populates="evidence_items")


class BackfillPlan(Base):
    __tablename__ = "backfill_plans"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    failure_id = Column(String(36), ForeignKey("failures.id"), nullable=False)
    strategy = Column(String(50), nullable=False)  # baseline_full, proposed_selective
    affected_dates = Column(JSON, default=list)  # ['2026-09-10', '2026-09-11']
    affected_partitions = Column(JSON, default=list)
    affected_tasks = Column(JSON, default=list)
    dependency_chain = Column(JSON, default=list)
    total_partitions = Column(Integer, default=0)
    selective_partitions_count = Column(Integer, default=0)
    estimated_runtime_seconds = Column(Float, default=0.0)
    estimated_resource_usage = Column(JSON, default=dict)
    estimated_cost = Column(Float, default=0.0)
    status = Column(String(30), default="CREATED")  # CREATED, SCHEDULED, EXECUTED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)

    failure = relationship("Failure", back_populates="backfill_plans")
    partitions = relationship("BackfillPartition", back_populates="plan", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="plan", cascade="all, delete-orphan")


class BackfillPartition(Base):
    __tablename__ = "backfill_partitions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    plan_id = Column(String(36), ForeignKey("backfill_plans.id"), nullable=False)
    partition_date = Column(String(20), nullable=False)
    rows_count = Column(Integer, default=0)
    status = Column(String(30), default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED
    error_message = Column(Text, nullable=True)

    plan = relationship("BackfillPlan", back_populates="partitions")


class Schedule(Base):
    __tablename__ = "schedules"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    plan_id = Column(String(36), ForeignKey("backfill_plans.id"), nullable=False)
    resource_tier = Column(String(20), nullable=False)  # small, medium, large
    alpha_cost_weight = Column(Float, default=0.5)
    beta_time_weight = Column(Float, default=0.5)
    gamma_sla_weight = Column(Float, default=0.0)
    allocated_cpu = Column(Integer, nullable=False)
    allocated_memory_gb = Column(Integer, nullable=False)
    cost_per_minute = Column(Float, nullable=False)
    estimated_duration_seconds = Column(Float, nullable=False)
    estimated_cost = Column(Float, nullable=False)
    sla_penalty = Column(Float, default=0.0)
    objective_score = Column(Float, nullable=False)
    is_selected = Column(Boolean, default=False)
    constraint_status = Column(String(30), default="FEASIBLE")  # FEASIBLE, INFEASIBLE
    created_at = Column(DateTime, default=datetime.utcnow)

    plan = relationship("BackfillPlan", back_populates="schedules")
    schedule_tasks = relationship("ScheduleTask", back_populates="schedule", cascade="all, delete-orphan")
    recovery_runs = relationship("RecoveryRun", back_populates="schedule")


class ScheduleTask(Base):
    __tablename__ = "schedule_tasks"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    schedule_id = Column(String(36), ForeignKey("schedules.id"), nullable=False)
    task_name = Column(String(100), nullable=False)
    sequence_order = Column(Integer, default=1)
    allocated_cpu = Column(Integer, default=1)
    allocated_memory_gb = Column(Integer, default=2)

    schedule = relationship("Schedule", back_populates="schedule_tasks")


class RecoveryRun(Base):
    __tablename__ = "recovery_runs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    failure_id = Column(String(36), ForeignKey("failures.id"), nullable=False)
    plan_id = Column(String(36), ForeignKey("backfill_plans.id"), nullable=False)
    schedule_id = Column(String(36), ForeignKey("schedules.id"), nullable=False)
    idempotency_key = Column(String(64), nullable=False, unique=True)
    status = Column(String(30), default="PENDING")  # PENDING, RUNNING, SUCCESS, FAILED
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)
    oracle_validation_status = Column(String(30), default="PENDING")  # PENDING, PASS, FAIL
    oracle_diff_summary = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    retry_history = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    schedule = relationship("Schedule", back_populates="recovery_runs")
    recovery_task_runs = relationship("RecoveryTaskRun", back_populates="recovery_run", cascade="all, delete-orphan")


class RecoveryTaskRun(Base):
    __tablename__ = "recovery_task_runs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    recovery_run_id = Column(String(36), ForeignKey("recovery_runs.id"), nullable=False)
    task_name = Column(String(100), nullable=False)
    partition_date = Column(String(255), nullable=True)
    status = Column(String(30), default="PENDING")  # PENDING, RUNNING, SUCCESS, FAILED, BLOCKED, SKIPPED
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)

    recovery_run = relationship("RecoveryRun", back_populates="recovery_task_runs")


class PipelineMetric(Base):
    __tablename__ = "pipeline_metrics"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), nullable=False, index=True)
    task_name = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    cpu_percent = Column(Float, default=0.0)
    memory_mb = Column(Float, default=0.0)
    latency_ms = Column(Float, default=0.0)
    throughput_rps = Column(Float, default=0.0)
    error_rate = Column(Float, default=0.0)
    rows_processed = Column(Integer, default=0)


class Experiment(Base):
    __tablename__ = "experiments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    random_seed = Column(Integer, default=42)
    scenario = Column(String(100), nullable=False)
    configuration = Column(JSON, nullable=False)
    code_version = Column(String(50), default="1.0.0")
    model_version = Column(String(50), default="1.0.0")
    status = Column(String(30), default="NOT_RUN")  # NOT_RUN, RUNNING, COMPLETED, FAILED
    result_csv_path = Column(String(255), nullable=True)
    logs = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    executed_at = Column(DateTime, nullable=True)

    results = relationship("ExperimentResult", back_populates="experiment", cascade="all, delete-orphan")


class ExperimentResult(Base):
    __tablename__ = "experiment_results"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    experiment_id = Column(String(36), ForeignKey("experiments.id"), nullable=False)
    metric_name = Column(String(100), nullable=False)
    baseline_value = Column(Float, nullable=True)
    proposed_value = Column(Float, nullable=True)
    target_value = Column(Float, nullable=True)
    relative_improvement_pct = Column(Float, nullable=True)
    raw_metrics = Column(JSON, default=dict)

    experiment = relationship("Experiment", back_populates="results")


class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    file_path = Column(String(255), nullable=False)
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    columns_list = Column(JSON, default=list)
    sha256_hash = Column(String(64), nullable=False)
    is_synthetic = Column(Boolean, default=False)
    experiment_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ModelVersion(Base):
    __tablename__ = "model_versions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    model_type = Column(String(50), nullable=False)  # LSTM_ANOMALY, CAUSE_CLASSIFIER, ISOLATION_FOREST
    training_dataset = Column(String(100), nullable=False)
    features_list = Column(JSON, default=list)
    evaluation_metrics = Column(JSON, default=dict)
    file_path = Column(String(255), nullable=False)
    status = Column(String(30), default="TRAINED")  # NOT_TRAINED, TRAINING, TRAINED, FAILED
    trained_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    resource_id = Column(String(36), nullable=True)
    user_or_system = Column(String(50), default="SYSTEM")
    result = Column(String(50), default="SUCCESS")
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    country = Column(String(100), default="United States")
    role = Column(String(50), default="ENGINEER")  # ENGINEER, ADMIN, RESEARCHER
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

