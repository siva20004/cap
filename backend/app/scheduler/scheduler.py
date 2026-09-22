from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import BackfillPlan, Schedule, ScheduleTask
from app.scheduler.cost_model import RESOURCE_TIERS

class CostAwareScheduler:
    def __init__(self, db: Session):
        self.db = db

    def generate_schedules(
        self,
        plan_id: str,
        alpha_cost: float = 0.5,
        beta_time: float = 0.5,
        gamma_sla: float = 0.0,
        sla_max_seconds: float = 300.0
    ) -> List[Schedule]:
        plan = self.db.query(BackfillPlan).filter(BackfillPlan.id == plan_id).first()
        if not plan:
            raise ValueError(f"BackfillPlan '{plan_id}' not found.")

        base_duration = max(plan.estimated_runtime_seconds, 0.05)

        # 1. Compute duration and cost for each resource tier
        tier_calculations = []
        for tier_key, cfg in RESOURCE_TIERS.items():
            est_duration = round(base_duration * cfg.speed_factor, 3)
            duration_minutes = est_duration / 60.0
            est_cost = round(max(duration_minutes * cfg.cost_per_minute, 0.001), 4)

            # SLA penalty if duration exceeds threshold
            sla_penalty = 0.0
            if est_duration > sla_max_seconds:
                sla_penalty = round((est_duration - sla_max_seconds) / sla_max_seconds, 3)

            tier_calculations.append({
                "tier": tier_key,
                "cfg": cfg,
                "duration": est_duration,
                "cost": est_cost,
                "sla_penalty": sla_penalty
            })

        max_cost = max(t["cost"] for t in tier_calculations)
        max_duration = max(t["duration"] for t in tier_calculations)

        # 2. Compute multi-objective score: lower score = better
        for t in tier_calculations:
            norm_cost = t["cost"] / max_cost if max_cost > 0 else 1.0
            norm_duration = t["duration"] / max_duration if max_duration > 0 else 1.0
            score = (alpha_cost * norm_cost) + (beta_time * norm_duration) + (gamma_sla * t["sla_penalty"])
            t["score"] = round(score, 4)

        # 3. Pick optimal tier
        best_tier = min(tier_calculations, key=lambda x: x["score"])

        created_schedules = []
        for t in tier_calculations:
            is_selected = (t["tier"] == best_tier["tier"])
            schedule = Schedule(
                plan_id=plan_id,
                resource_tier=t["tier"],
                alpha_cost_weight=alpha_cost,
                beta_time_weight=beta_time,
                gamma_sla_weight=gamma_sla,
                allocated_cpu=t["cfg"].cpu_cores,
                allocated_memory_gb=t["cfg"].memory_gb,
                cost_per_minute=t["cfg"].cost_per_minute,
                estimated_duration_seconds=t["duration"],
                estimated_cost=t["cost"],
                sla_penalty=t["sla_penalty"],
                objective_score=t["score"],
                is_selected=is_selected,
                constraint_status="FEASIBLE",
                created_at=datetime.utcnow()
            )
            self.db.add(schedule)
            self.db.flush()

            # Create schedule tasks
            for seq_idx, task_name in enumerate(plan.affected_tasks, start=1):
                sch_task = ScheduleTask(
                    schedule_id=schedule.id,
                    task_name=task_name,
                    sequence_order=seq_idx,
                    allocated_cpu=t["cfg"].cpu_cores,
                    allocated_memory_gb=t["cfg"].memory_gb
                )
                self.db.add(sch_task)

            created_schedules.append(schedule)

        self.db.commit()
        return created_schedules
