from prometheus_client import Counter, Histogram, Gauge

# Real Prometheus Metrics
PIPELINE_RUNS_TOTAL = Counter(
    "pipeline_runs_total",
    "Total number of pipeline runs executed",
    ["pipeline_name", "status"]
)

PIPELINE_FAILURES_TOTAL = Counter(
    "pipeline_failures_total",
    "Total number of pipeline execution failures",
    ["failure_type", "task_name"]
)

CONTRACT_VIOLATIONS_TOTAL = Counter(
    "contract_violations_total",
    "Total number of data contract violations detected",
    ["rule_type", "severity"]
)

RECOVERY_SUCCESS_TOTAL = Counter(
    "recovery_success_total",
    "Total number of successfully executed recoveries"
)

RECOVERY_FAILURE_TOTAL = Counter(
    "recovery_failure_total",
    "Total number of failed recoveries"
)

RECOVERY_DURATION_SECONDS = Histogram(
    "recovery_duration_seconds",
    "Time taken to execute complete recovery workflow in seconds",
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0]
)

BACKFILL_DURATION_SECONDS = Histogram(
    "backfill_duration_seconds",
    "Duration of backfill partition processing in seconds",
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0]
)

PIPELINE_EXECUTION_SECONDS = Histogram(
    "pipeline_execution_seconds",
    "Total pipeline DAG execution time in seconds",
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

ESTIMATED_COST_GAUGE = Gauge(
    "estimated_cost_dollars",
    "Estimated cost calculated by cost-aware scheduler"
)

ACTUAL_COST_GAUGE = Gauge(
    "actual_cost_dollars",
    "Actual compute cost incurred by pipeline and recovery runs"
)

ANOMALY_DETECTIONS_TOTAL = Counter(
    "anomaly_detections_total",
    "Total number of telemetry anomaly detections",
    ["model_type", "status"]
)
