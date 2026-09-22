from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class ResearchBenchmarkMetric:
    metric_name: str
    target_value: float
    unit: str
    description: str

# Standard target research goals as outlined in original project literature
PROJECT_RESEARCH_TARGETS = {
    "root_cause_top1_accuracy": ResearchBenchmarkMetric(
        metric_name="Root Cause Top-1 Accuracy",
        target_value=95.0,
        unit="%",
        description="Top-1 diagnostic accuracy of root-cause classifier vs baseline rules."
    ),
    "root_cause_top3_accuracy": ResearchBenchmarkMetric(
        metric_name="Root Cause Top-3 Accuracy",
        target_value=99.0,
        unit="%",
        description="Top-3 diagnostic recall coverage."
    ),
    "contract_violations_caught": ResearchBenchmarkMetric(
        metric_name="Contract Violations Caught",
        target_value=100.0,
        unit="%",
        description="Detection rate of schema and data-contract quality anomalies."
    ),
    "backfill_makespan_reduction": ResearchBenchmarkMetric(
        metric_name="Backfill Makespan Reduction",
        target_value=60.0,
        unit="%",
        description="Time saved by selective backfill over baseline full rerun."
    ),
    "backfill_cost_reduction": ResearchBenchmarkMetric(
        metric_name="Backfill Cost Reduction",
        target_value=50.0,
        unit="%",
        description="Cloud compute cost saved by selective backfill partition pruning."
    ),
    "lstm_anomaly_f1": ResearchBenchmarkMetric(
        metric_name="LSTM Anomaly Detection F1-Score",
        target_value=92.0,
        unit="%",
        description="F1 performance of temporal sequential LSTM model."
    )
}
