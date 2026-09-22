import time
import psutil
import os
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, field

@dataclass
class TaskContext:
    run_id: str
    pipeline_id: str
    input_file: str
    output_file: Optional[str] = None
    data: Optional[Any] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    failure_scenario: Optional[str] = None
    logs: list = field(default_factory=list)

    def log(self, message: str):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        entry = f"[{timestamp}] {message}"
        self.logs.append(entry)

@dataclass
class TaskResult:
    task_name: str
    status: str  # SUCCESS, FAILED, BLOCKED, SKIPPED
    duration_seconds: float
    cpu_usage_pct: float
    memory_mb: float
    rows_processed: int = 0
    error_message: Optional[str] = None
    output_data: Optional[Any] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

class PipelineTaskOperator:
    def __init__(self, task_name: str, operator_type: str, upstream_tasks: list = None, retry_limit: int = 0):
        self.task_name = task_name
        self.operator_type = operator_type
        self.upstream_tasks = upstream_tasks or []
        self.retry_limit = retry_limit

    def execute(self, context: TaskContext) -> TaskResult:
        """Subclasses or registered functions implement this method."""
        raise NotImplementedError("Operators must implement execute()")

    def run_with_telemetry(self, context: TaskContext) -> TaskResult:
        process = psutil.Process(os.getpid())
        start_cpu = process.cpu_percent(interval=None)
        start_mem = process.memory_info().rss / (1024 * 1024)
        start_time = time.time()

        context.log(f"Starting task '{self.task_name}' (Operator: {self.operator_type})...")

        try:
            result = self.execute(context)
            duration = time.time() - start_time
            end_cpu = process.cpu_percent(interval=None)
            end_mem = process.memory_info().rss / (1024 * 1024)
            
            result.duration_seconds = round(duration, 4)
            result.cpu_usage_pct = max(round(end_cpu, 2), 0.1)
            result.memory_mb = round(end_mem, 2)
            context.log(f"Task '{self.task_name}' finished with status {result.status} in {result.duration_seconds}s.")
            return result
        except Exception as e:
            duration = time.time() - start_time
            context.log(f"Task '{self.task_name}' FAILED with error: {str(e)}")
            return TaskResult(
                task_name=self.task_name,
                status="FAILED",
                duration_seconds=round(duration, 4),
                cpu_usage_pct=round(process.cpu_percent(interval=None), 2),
                memory_mb=round(process.memory_info().rss / (1024 * 1024), 2),
                rows_processed=0,
                error_message=str(e)
            )
