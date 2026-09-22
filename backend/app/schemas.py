from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class AppBaseModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

# ==========================================
# Pipeline Schemas
# ==========================================
class PipelineTaskBase(AppBaseModel):
    task_name: str
    operator_type: str
    upstream_tasks: List[str] = []
    retry_limit: int = 0
    timeout_seconds: int = 300

class PipelineTaskCreate(PipelineTaskBase):
    pass

class PipelineTaskResponse(PipelineTaskBase):
    id: str
    pipeline_id: str
    created_at: datetime

class PipelineCreate(AppBaseModel):
    name: str
    description: Optional[str] = None
    schedule_cron: Optional[str] = None
    tasks: List[PipelineTaskCreate] = []

class PipelineResponse(AppBaseModel):
    id: str
    name: str
    description: Optional[str] = None
    schedule_cron: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    tasks: List[PipelineTaskResponse] = []

# ==========================================
# Run Schemas
# ==========================================
class PipelineRunTrigger(AppBaseModel):
    run_type: str = "MANUAL"
    dataset_file: Optional[str] = None
    contract_version: Optional[str] = "1.0"
    failure_scenario: Optional[str] = None  # None or one of the 10 failure injection scenarios

class TaskRunResponse(AppBaseModel):
    id: str
    run_id: str
    task_name: str
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: float = 0.0
    cpu_usage_pct: float = 0.0
    memory_mb: float = 0.0
    rows_processed: int = 0
    error_message: Optional[str] = None
    retry_count: int = 0

class PipelineRunResponse(AppBaseModel):
    id: str
    pipeline_id: str
    run_type: str
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: float = 0.0
    rows_processed: int = 0
    input_dataset: Optional[str] = None
    contract_version: Optional[str] = None
    output_dataset: Optional[str] = None
    execution_logs: Optional[str] = None
    cost: float = 0.0
    resource_metrics: Dict[str, Any] = {}
    failure_scenario: Optional[str] = None
    created_at: datetime
    task_runs: List[TaskRunResponse] = []

# ==========================================
# Data Contract Schemas
# ==========================================
class ContractVersionCreate(AppBaseModel):
    version_str: str
    schema_definition: Dict[str, Any]

class ContractCreate(AppBaseModel):
    table_name: str
    description: Optional[str] = None
    active_version: str = "1.0"
    initial_schema: Dict[str, Any]

class ContractVersionResponse(AppBaseModel):
    id: str
    contract_id: str
    version_str: str
    schema_definition: Dict[str, Any]
    sha256_hash: str
    created_at: datetime

class ContractResponse(AppBaseModel):
    id: str
    table_name: str
    description: Optional[str] = None
    active_version: str
    created_at: datetime
    updated_at: datetime
    versions: List[ContractVersionResponse] = []

class ContractValidateRequest(AppBaseModel):
    dataset_file: str
    contract_table: str
    version: Optional[str] = None

class ContractViolationResponse(AppBaseModel):
    id: str
    run_id: Optional[str] = None
    contract_version_id: str
    rule_type: str
    column_name: Optional[str] = None
    violation_details: str
    severity: str
    invalid_rows_count: int
    timestamp: datetime

class ContractValidationResult(AppBaseModel):
    is_valid: bool
    total_violations: int
    contract_version: str
    violations: List[Dict[str, Any]]

# ==========================================
# Failure Schemas
# ==========================================
class FailureResponse(AppBaseModel):
    id: str
    run_id: str
    pipeline_name: str
    task_name: str
    failure_type: str
    error_message: str
    stack_trace: Optional[str] = None
    timestamp: datetime
    relevant_metrics: Dict[str, Any] = {}
    affected_partitions: List[str] = []
    evidence_summary: List[str] = []

class FailureInjectRequest(AppBaseModel):
    pipeline_id: str
    scenario: str  # missing_column, wrong_datatype, invalid_value, null_violation, duplicate_record, upstream_dependency, resource_constraint, timeout, schema_change, output_validation

# ==========================================
# Diagnosis & Evidence Schemas
# ==========================================
class RankedCause(AppBaseModel):
    cause: str
    probability: float

class DiagnosisEvidenceResponse(AppBaseModel):
    id: str
    evidence_type: str
    rule_or_metric: str
    observed_value: str
    expected_value: Optional[str] = None
    description: str
    timestamp: datetime

class DiagnosisResponse(AppBaseModel):
    id: str
    failure_id: str
    model_version: str
    baseline_cause: str
    predicted_cause: str
    confidence: float
    ranked_causes: List[RankedCause]
    features: Dict[str, Any]
    evidence: List[str] = []
    anomaly_status: str
    anomaly_score: float
    timestamp: datetime
    evidence_items: List[DiagnosisEvidenceResponse] = []

# ==========================================
# Backfill Schemas
# ==========================================
class BackfillPlanRequest(AppBaseModel):
    failure_id: str
    strategy: str = "proposed_selective"  # baseline_full or proposed_selective

class BackfillPartitionResponse(AppBaseModel):
    id: str
    partition_date: str
    rows_count: int
    status: str
    error_message: Optional[str] = None

class BackfillPlanResponse(AppBaseModel):
    id: str
    failure_id: str
    strategy: str
    affected_dates: List[str]
    affected_partitions: List[str]
    affected_tasks: List[str]
    dependency_chain: List[str]
    total_partitions: int
    selective_partitions_count: int
    estimated_runtime_seconds: float
    estimated_resource_usage: Dict[str, Any]
    estimated_cost: float
    status: str
    created_at: datetime
    partitions: List[BackfillPartitionResponse] = []

# ==========================================
# Scheduler Schemas
# ==========================================
class ScheduleGenerateRequest(AppBaseModel):
    plan_id: str
    alpha_cost_weight: float = Field(0.5, ge=0.0, le=1.0)
    beta_time_weight: float = Field(0.5, ge=0.0, le=1.0)
    gamma_sla_weight: float = Field(0.0, ge=0.0, le=1.0)
    sla_max_seconds: Optional[float] = 300.0

class ScheduleTaskResponse(AppBaseModel):
    id: str
    task_name: str
    sequence_order: int
    allocated_cpu: int
    allocated_memory_gb: int

class ScheduleResponse(AppBaseModel):
    id: str
    plan_id: str
    resource_tier: str
    alpha_cost_weight: float
    beta_time_weight: float
    gamma_sla_weight: float
    allocated_cpu: int
    allocated_memory_gb: int
    cost_per_minute: float
    estimated_duration_seconds: float
    estimated_cost: float
    sla_penalty: float
    objective_score: float
    is_selected: bool
    constraint_status: str
    created_at: datetime
    schedule_tasks: List[ScheduleTaskResponse] = []

# ==========================================
# Recovery Schemas
# ==========================================
class RecoveryExecuteRequest(AppBaseModel):
    schedule_id: str
    idempotency_key: Optional[str] = None

class RecoveryTaskRunResponse(AppBaseModel):
    id: str
    task_name: str
    partition_date: Optional[str] = None
    status: str
    duration_seconds: float
    error_message: Optional[str] = None

class RecoveryRunResponse(AppBaseModel):
    id: str
    failure_id: str
    plan_id: str
    schedule_id: str
    idempotency_key: str
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: float
    actual_cost: float
    oracle_validation_status: str
    oracle_diff_summary: Dict[str, Any]
    error_message: Optional[str] = None
    retry_history: List[Dict[str, Any]] = []
    created_at: datetime
    recovery_task_runs: List[RecoveryTaskRunResponse] = []

# ==========================================
# Experiments Schemas
# ==========================================
class ExperimentRunRequest(AppBaseModel):
    name: str
    description: Optional[str] = None
    scenario: str = "ALL_SCENARIOS"
    random_seed: int = 42
    sample_size: int = 100

class ExperimentResultResponse(AppBaseModel):
    id: str
    metric_name: str
    baseline_value: Optional[float] = None
    proposed_value: Optional[float] = None
    target_value: Optional[float] = None
    relative_improvement_pct: Optional[float] = None
    raw_metrics: Dict[str, Any] = {}

class ExperimentResponse(AppBaseModel):
    id: str
    name: str
    description: Optional[str] = None
    random_seed: int
    scenario: str
    configuration: Dict[str, Any]
    code_version: str
    model_version: str
    status: str
    result_csv_path: Optional[str] = None
    logs: Optional[str] = None
    created_at: datetime
    executed_at: Optional[datetime] = None
    results: List[ExperimentResultResponse] = []

# ==========================================
# Datasets & Models & Telemetry Schemas
# ==========================================
class DatasetResponse(AppBaseModel):
    id: str
    name: str
    file_path: str
    row_count: int
    column_count: int
    columns_list: List[str]
    sha256_hash: str
    is_synthetic: bool
    experiment_id: Optional[str] = None
    created_at: datetime

class ModelTrainRequest(AppBaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_type: str = "ALL"  # LSTM_ANOMALY, CAUSE_CLASSIFIER, ISOLATION_FOREST, or ALL
    random_seed: int = 42
    epochs: int = 15

class ModelVersionResponse(AppBaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)
    id: str
    model_name: str
    version: str
    model_type: str
    training_dataset: str
    features_list: List[str]
    evaluation_metrics: Dict[str, Any]
    file_path: str
    status: str
    trained_at: datetime

class AuditLogResponse(AppBaseModel):
    id: str
    action: str
    resource: str
    resource_id: Optional[str] = None
    user_or_system: str
    result: str
    details: Dict[str, Any]
    timestamp: datetime

class DashboardSummaryResponse(AppBaseModel):
    total_pipelines: int
    total_runs: int
    successful_runs: int
    failed_runs: int
    contract_violations: int
    active_recoveries: int
    avg_recovery_time_seconds: float
    total_processing_cost: float
    run_status_distribution: Dict[str, int]
    failure_type_distribution: Dict[str, int]
    cost_trend: List[Dict[str, Any]]
    recovery_time_trend: List[Dict[str, Any]]

# ==========================================
# User & Authentication Schemas
# ==========================================
class UserCreate(AppBaseModel):
    email: str
    first_name: str
    last_name: str
    password: str
    country: Optional[str] = "United States"

class UserLogin(AppBaseModel):
    email: str
    password: str

class UserResponse(AppBaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    country: Optional[str] = "United States"
    role: str = "ENGINEER"
    is_active: bool = True
    created_at: datetime

class TokenResponse(AppBaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

