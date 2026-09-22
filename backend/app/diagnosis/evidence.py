from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Failure, PipelineRun, ContractViolation, PipelineMetric

class EvidenceCollector:
    @staticmethod
    def collect_evidence(db: Session, failure: Failure, features: Dict[str, float]) -> List[Dict[str, Any]]:
        evidence_items = []

        # 1. Inspect Contract Violations
        violations = db.query(ContractViolation).filter(ContractViolation.run_id == failure.run_id).all()
        for v in violations:
            evidence_items.append({
                "evidence_type": "CONTRACT_VIOLATION",
                "rule_or_metric": v.rule_type,
                "observed_value": f"Column: {v.column_name}, Invalid Rows: {v.invalid_rows_count}",
                "expected_value": "0 violations adhering to active schema contract",
                "description": v.violation_details
            })

        # 2. Inspect Resource & Telemetry Spikes
        metrics = db.query(PipelineMetric).filter(PipelineMetric.run_id == failure.run_id).all()
        for m in metrics:
            if m.cpu_percent > 85.0:
                evidence_items.append({
                    "evidence_type": "TELEMETRY_ANOMALY",
                    "rule_or_metric": "CPU_UTILIZATION",
                    "observed_value": f"{m.cpu_percent}%",
                    "expected_value": "<= 80.0%",
                    "description": f"High CPU utilization anomaly observed during task '{m.task_name}'."
                })
            if m.memory_mb > 1024.0:
                evidence_items.append({
                    "evidence_type": "TELEMETRY_ANOMALY",
                    "rule_or_metric": "MEMORY_CONSUMPTION",
                    "observed_value": f"{m.memory_mb} MB",
                    "expected_value": "<= 1024.0 MB",
                    "description": f"Excessive memory consumption in task '{m.task_name}' exceeding allocated container limit."
                })

        # 3. Check Upstream Execution Trace
        if features.get("upstream_failed", 0) == 1:
            evidence_items.append({
                "evidence_type": "EXECUTION_DEPENDENCY",
                "rule_or_metric": "UPSTREAM_STATUS",
                "observed_value": "FAILED",
                "expected_value": "SUCCESS",
                "description": f"Upstream dependency failed before task '{failure.task_name}' could complete."
            })

        # 4. Check Runtime / Timeout
        if features.get("runtime_ratio", 1.0) > 2.5:
            evidence_items.append({
                "evidence_type": "EXECUTION_LATENCY",
                "rule_or_metric": "TASK_RUNTIME",
                "observed_value": f"Ratio: {features.get('runtime_ratio', 1.0)}x normal baseline",
                "expected_value": "1.0x baseline",
                "description": f"Execution exceeded maximum timeout threshold for task '{failure.task_name}'."
            })

        # 5. Direct Error Message Evidence
        evidence_items.append({
            "evidence_type": "ERROR_LOG",
            "rule_or_metric": "TASK_EXCEPTION",
            "observed_value": failure.error_message[:150],
            "expected_value": "Normal clean exit code 0",
            "description": f"Task '{failure.task_name}' threw unhandled exception: {failure.error_message}"
        })

        return evidence_items
