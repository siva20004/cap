import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models import Pipeline, PipelineRun, TaskRun, Failure, PipelineMetric, AuditLog
from app.pipeline.dag import DAG
from app.pipeline.task import TaskContext
from app.pipeline.registry import (
    ValidateContractOperator,
    CleanDataOperator,
    TransformOrdersOperator,
    AggregateMetricsOperator,
    StoreResultsOperator
)

def build_orders_dag() -> DAG:
    dag = DAG("orders_pipeline")
    t1 = ValidateContractOperator()
    t2 = CleanDataOperator(upstream_tasks=["validate_contract"])
    t3 = TransformOrdersOperator(upstream_tasks=["clean_data"])
    t4 = AggregateMetricsOperator(upstream_tasks=["transform_orders"])
    t5 = StoreResultsOperator(upstream_tasks=["aggregate_metrics"])

    dag.add_task(t1)
    dag.add_task(t2)
    dag.add_task(t3)
    dag.add_task(t4)
    dag.add_task(t5)
    return dag

class PipelineExecutor:
    def __init__(self, db: Session):
        self.db = db

    def run_pipeline(
        self,
        pipeline_id: str,
        input_dataset_path: str,
        contract_version: str = "1.0",
        failure_scenario: Optional[str] = None,
        run_type: str = "MANUAL"
    ) -> PipelineRun:
        pipeline = self.db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
        if not pipeline:
            raise ValueError(f"Pipeline '{pipeline_id}' does not exist.")

        dag = build_orders_dag()
        sorted_tasks = dag.topological_sort()

        # Create PipelineRun record in PostgreSQL
        run_id = str(uuid.uuid4())
        pipeline_run = PipelineRun(
            id=run_id,
            pipeline_id=pipeline_id,
            run_type=run_type,
            status="RUNNING",
            start_time=datetime.utcnow(),
            input_dataset=input_dataset_path,
            contract_version=contract_version,
            failure_scenario=failure_scenario,
            execution_logs=""
        )
        self.db.add(pipeline_run)
        self.db.commit()

        context = TaskContext(
            run_id=run_id,
            pipeline_id=pipeline_id,
            input_file=input_dataset_path,
            parameters={"contract_version": contract_version},
            failure_scenario=failure_scenario
        )

        overall_start = time.time()
        failed_task_name = None
        failure_error_msg = None
        executed_task_results = []
        total_rows_processed = 0

        # Execute DAG tasks in topological order
        for task_op in sorted_tasks:
            # Check if any upstream task failed
            if failed_task_name:
                downstream_set = dag.get_downstream_tasks(failed_task_name)
                if task_op.task_name in downstream_set or task_op.task_name != failed_task_name:
                    context.log(f"Task '{task_op.task_name}' is BLOCKED due to upstream failure in '{failed_task_name}'.")
                    blocked_run = TaskRun(
                        run_id=run_id,
                        task_name=task_op.task_name,
                        status="BLOCKED",
                        start_time=datetime.utcnow(),
                        end_time=datetime.utcnow(),
                        duration_seconds=0.0,
                        rows_processed=0,
                        error_message=f"Blocked by upstream task '{failed_task_name}' failure."
                    )
                    self.db.add(blocked_run)
                    self.db.commit()
                    continue

            task_run_record = TaskRun(
                run_id=run_id,
                task_name=task_op.task_name,
                status="RUNNING",
                start_time=datetime.utcnow()
            )
            self.db.add(task_run_record)
            self.db.commit()

            # Execute with telemetry
            result = task_op.run_with_telemetry(context)
            executed_task_results.append(result)

            task_run_record.status = result.status
            task_run_record.end_time = datetime.utcnow()
            task_run_record.duration_seconds = result.duration_seconds
            task_run_record.cpu_usage_pct = result.cpu_usage_pct
            task_run_record.memory_mb = result.memory_mb
            task_run_record.rows_processed = result.rows_processed
            task_run_record.error_message = result.error_message
            self.db.commit()

            # Record telemetry metric
            metric_entry = PipelineMetric(
                run_id=run_id,
                task_name=task_op.task_name,
                timestamp=datetime.utcnow(),
                cpu_percent=result.cpu_usage_pct,
                memory_mb=result.memory_mb,
                latency_ms=round(result.duration_seconds * 1000, 2),
                throughput_rps=round(result.rows_processed / max(result.duration_seconds, 0.001), 2),
                error_rate=1.0 if result.status == "FAILED" else 0.0,
                rows_processed=result.rows_processed
            )
            self.db.add(metric_entry)
            self.db.commit()

            if result.status == "SUCCESS":
                total_rows_processed = max(total_rows_processed, result.rows_processed)
            elif result.status == "FAILED":
                failed_task_name = task_op.task_name
                failure_error_msg = result.error_message

        overall_duration = time.time() - overall_start
        pipeline_run.duration_seconds = round(overall_duration, 4)
        pipeline_run.end_time = datetime.utcnow()
        pipeline_run.rows_processed = total_rows_processed
        pipeline_run.execution_logs = "\n".join(context.logs)

        # Calculate actual cost: $0.0008 per CPU second + $0.0001 per MB second
        avg_cpu = sum(r.cpu_usage_pct for r in executed_task_results) / max(len(executed_task_results), 1)
        max_mem = max([r.memory_mb for r in executed_task_results] or [0.0])
        computed_cost = round((overall_duration * 0.0005) + (max_mem * 0.00001), 4)
        pipeline_run.cost = max(computed_cost, 0.001)
        pipeline_run.resource_metrics = {
            "avg_cpu_pct": round(avg_cpu, 2),
            "max_memory_mb": round(max_mem, 2),
            "overall_duration_seconds": round(overall_duration, 3)
        }

        if failed_task_name:
            pipeline_run.status = "FAILED"
            # Create Failure record in PostgreSQL
            failure_record = Failure(
                run_id=run_id,
                pipeline_name=pipeline.name,
                task_name=failed_task_name,
                failure_type=failure_scenario or "task_execution_error",
                error_message=failure_error_msg or "Unknown execution failure",
                timestamp=datetime.utcnow(),
                relevant_metrics={
                    "failed_task": failed_task_name,
                    "avg_cpu": avg_cpu,
                    "max_mem": max_mem,
                    "duration": overall_duration,
                    "scenario": failure_scenario
                },
                affected_partitions=["2026-09-10", "2026-09-11", "2026-09-12"] if failure_scenario else [],
                evidence_summary=[f"Task '{failed_task_name}' terminated unexpectedly with: {failure_error_msg}"]
            )
            self.db.add(failure_record)
        else:
            pipeline_run.status = "SUCCESS"
            pipeline_run.output_dataset = context.output_file

        # Audit log entry
        audit = AuditLog(
            action="PIPELINE_RUN",
            resource="pipeline_runs",
            resource_id=run_id,
            user_or_system="SYSTEM",
            result=pipeline_run.status,
            details={"pipeline": pipeline.name, "duration": overall_duration, "failure_scenario": failure_scenario}
        )
        self.db.add(audit)
        self.db.commit()
        self.db.refresh(pipeline_run)
        return pipeline_run
