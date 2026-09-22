from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import Failure, BackfillPlan, BackfillPartition, PipelineRun
from app.backfill.partition import PartitionManager
from app.pipeline.executor import build_orders_dag

class BackfillPlanner:
    def __init__(self, db: Session):
        self.db = db

    def generate_plan(self, failure_id: str, strategy: str = "proposed_selective") -> BackfillPlan:
        failure = self.db.query(Failure).filter(Failure.id == failure_id).first()
        if not failure:
            raise ValueError(f"Failure '{failure_id}' not found.")

        run = self.db.query(PipelineRun).filter(PipelineRun.id == failure.run_id).first()
        input_file = run.input_dataset if run else "data/raw/orders.csv"

        all_partitions = PartitionManager.extract_available_partitions(input_file)
        dag = build_orders_dag()

        # Determine affected tasks: failed task + downstream tasks
        affected_tasks = [failure.task_name]
        downstream = sorted(list(dag.get_downstream_tasks(failure.task_name)))
        affected_tasks.extend(downstream)

        # Baseline: All partitions and all tasks
        # Proposed: Selective partitions (only affected partitions) and only affected tasks
        if strategy == "baseline_full":
            affected_dates = [p["date"] for p in all_partitions]
            plan_tasks = [t.task_name for t in dag.topological_sort()]
            selective_count = len(all_partitions)
        else:
            # Selective: default to affected dates from failure metadata, or subset
            if failure.affected_partitions:
                affected_dates = [str(d) for d in failure.affected_partitions]
            else:
                # Default affected partition window
                affected_dates = [p["date"] for p in all_partitions[:3]]
            plan_tasks = affected_tasks
            selective_count = len(affected_dates)

        # Calculate estimated runtime and cost based on task count and partition count
        # Each partition takes ~0.02s per task on standard medium tier
        est_runtime_seconds = round(len(affected_dates) * len(plan_tasks) * 0.025, 3)
        # Medium tier is $0.05/min = $0.000833/sec
        est_cost = round(max((est_runtime_seconds / 60.0) * 0.05, 0.001), 4)

        plan = BackfillPlan(
            failure_id=failure_id,
            strategy=strategy,
            affected_dates=affected_dates,
            affected_partitions=[f"dt={d}" for d in affected_dates],
            affected_tasks=plan_tasks,
            dependency_chain=downstream,
            total_partitions=len(all_partitions),
            selective_partitions_count=selective_count,
            estimated_runtime_seconds=est_runtime_seconds,
            estimated_resource_usage={"cpu_cores": 2, "memory_gb": 4},
            estimated_cost=est_cost,
            status="CREATED",
            created_at=datetime.utcnow()
        )
        self.db.add(plan)
        self.db.flush()

        for p_info in all_partitions:
            if p_info["date"] in affected_dates:
                part = BackfillPartition(
                    plan_id=plan.id,
                    partition_date=p_info["date"],
                    rows_count=p_info["rows"],
                    status="PENDING"
                )
                self.db.add(part)

        self.db.commit()
        self.db.refresh(plan)
        return plan
