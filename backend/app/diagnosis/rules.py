from typing import Dict, Any, Tuple, List

class RuleBasedDiagnosisBaseline:
    """
    Deterministic rule-based baseline diagnosis engine.
    Used as the benchmark against which the AI ML classifier is evaluated.
    """

    CAUSE_SCHEMA_CHANGE = "schema_change"
    CAUSE_DATA_QUALITY = "data_quality"
    CAUSE_DEPENDENCY_FAILURE = "dependency_failure"
    CAUSE_RESOURCE_CONSTRAINT = "resource_constraint"
    CAUSE_TIMEOUT = "timeout"
    CAUSE_UNKNOWN = "unknown"

    @classmethod
    def diagnose(cls, features: Dict[str, Any]) -> Tuple[str, float, List[str]]:
        """
        Takes extracted telemetry & contract features and produces:
        (predicted_cause: str, confidence: float, evidence: List[str])
        """
        evidence = []

        # Rule 1: Schema change rules
        if features.get("schema_changed", 0) == 1 or features.get("missing_cols_count", 0) > 0:
            evidence.append(f"Schema mismatch detected: missing_cols={features.get('missing_cols_count', 0)}")
            return cls.CAUSE_SCHEMA_CHANGE, 0.90, evidence

        # Rule 2: Contract violation / Data quality
        if features.get("contract_violation_count", 0) > 0 or features.get("null_rate", 0.0) > 0.0 or features.get("duplicate_rate", 0.0) > 0.0:
            evidence.append(f"Data quality violations detected: count={features.get('contract_violation_count', 0)}, null_rate={features.get('null_rate', 0.0)}")
            return cls.CAUSE_DATA_QUALITY, 0.85, evidence

        # Rule 3: Upstream dependency failure
        if features.get("upstream_failed", 0) == 1:
            evidence.append("Upstream task failed before downstream execution commenced.")
            return cls.CAUSE_DEPENDENCY_FAILURE, 0.95, evidence

        # Rule 4: Resource constraint
        if features.get("cpu_usage", 0.0) > 85.0 or features.get("memory_mb", 0.0) > 1024.0 or features.get("is_oom", 0) == 1:
            evidence.append(f"Resource threshold exceeded: CPU={features.get('cpu_usage', 0.0)}%, Mem={features.get('memory_mb', 0.0)}MB")
            return cls.CAUSE_RESOURCE_CONSTRAINT, 0.88, evidence

        # Rule 5: Timeout failure
        if features.get("runtime_ratio", 1.0) > 2.0 or features.get("is_timeout", 0) == 1:
            evidence.append(f"Runtime exceeded threshold: runtime_ratio={features.get('runtime_ratio', 1.0)}")
            return cls.CAUSE_TIMEOUT, 0.85, evidence

        evidence.append("No explicit heuristic rules triggered; classified as unknown.")
        return cls.CAUSE_UNKNOWN, 0.50, evidence
