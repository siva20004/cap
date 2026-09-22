from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models import Failure, PipelineRun, ContractViolation, PipelineMetric

FEATURE_NAMES = [
    "schema_changed",
    "missing_cols_count",
    "null_rate",
    "duplicate_rate",
    "contract_violation_count",
    "upstream_failed",
    "cpu_usage",
    "memory_mb",
    "runtime_ratio",
    "error_rate",
    "throughput_change",
    "latency_change"
]

class FeatureExtractor:
    @staticmethod
    def extract_features_from_failure(db: Session, failure: Failure) -> Dict[str, float]:
        run = db.query(PipelineRun).filter(PipelineRun.id == failure.run_id).first()
        violations = db.query(ContractViolation).filter(ContractViolation.run_id == failure.run_id).all()
        metrics = db.query(PipelineMetric).filter(PipelineMetric.run_id == failure.run_id).all()

        # 1. Contract & Schema signals
        missing_cols = [v for v in violations if v.rule_type == "missing_column"]
        null_viols = [v for v in violations if v.rule_type == "null_violation"]
        dup_viols = [v for v in violations if v.rule_type == "duplicate_record"]

        schema_changed = 1 if len(missing_cols) > 0 or failure.failure_type == "schema_change" else 0
        missing_cols_count = len(missing_cols)
        contract_violation_count = len(violations)

        total_rows = max(run.rows_processed if run else 500, 1)
        null_rate = sum(v.invalid_rows_count for v in null_viols) / total_rows
        duplicate_rate = sum(v.invalid_rows_count for v in dup_viols) / total_rows

        # 2. Upstream dependency signals
        upstream_failed = 1 if failure.failure_type == "upstream_dependency" or "Upstream" in failure.error_message else 0

        # 3. Telemetry and resource signals
        if metrics:
            cpu_usage = float(max(m.cpu_percent for m in metrics))
            memory_mb = float(max(m.memory_mb for m in metrics))
            error_rate = float(max(m.error_rate for m in metrics))
        else:
            cpu_usage = float(failure.relevant_metrics.get("avg_cpu", 40.0))
            memory_mb = float(failure.relevant_metrics.get("max_mem", 250.0))
            error_rate = 1.0

        # Check for OOM / Memory limit
        if failure.failure_type == "resource_constraint" or "OOM" in failure.error_message or "Memory" in failure.error_message:
            cpu_usage = max(cpu_usage, 95.0)
            memory_mb = max(memory_mb, 3500.0)

        # 4. Runtime ratio
        baseline_duration = 0.15  # Normal runs take ~0.15s
        actual_duration = run.duration_seconds if run else failure.relevant_metrics.get("duration", 0.15)
        runtime_ratio = float(actual_duration / baseline_duration) if baseline_duration > 0 else 1.0

        if failure.failure_type == "timeout" or "timeout" in failure.error_message.lower():
            runtime_ratio = max(runtime_ratio, 3.5)

        throughput_change = -0.5 if error_rate > 0 else 0.0
        latency_change = 2.0 if runtime_ratio > 2.0 else 0.0

        return {
            "schema_changed": float(schema_changed),
            "missing_cols_count": float(missing_cols_count),
            "null_rate": round(float(null_rate), 4),
            "duplicate_rate": round(float(duplicate_rate), 4),
            "contract_violation_count": float(contract_violation_count),
            "upstream_failed": float(upstream_failed),
            "cpu_usage": round(float(cpu_usage), 2),
            "memory_mb": round(float(memory_mb), 2),
            "runtime_ratio": round(float(runtime_ratio), 2),
            "error_rate": round(float(error_rate), 2),
            "throughput_change": round(float(throughput_change), 4),
            "latency_change": round(float(latency_change), 4)
        }
