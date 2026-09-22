import os
import sys
from pathlib import Path
from datetime import datetime

# Add backend and workspace root to sys.path
workspace_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(workspace_root / "backend"))
sys.path.insert(0, str(workspace_root))

from app.database import SessionLocal, init_db
from app.models import Pipeline, PipelineTask, Dataset, AuditLog
from app.contracts.schema_loader import load_contract_file, get_or_create_contract
from scripts.generate_orders_dataset import generate_orders_dataset

def seed():
    print("--- Initializing Database ---")
    init_db()
    db = SessionLocal()

    try:
        # 1. Seed Contracts
        contracts_dir = Path("data/contracts")
        v1_path = contracts_dir / "orders_v1.json"
        v2_path = contracts_dir / "orders_v2.json"

        if v1_path.exists():
            v1_data = load_contract_file(v1_path)
            cv1 = get_or_create_contract(db, v1_data)
            print(f"Loaded contract: {cv1.contract.table_name} v{cv1.version_str} (hash: {cv1.sha256_hash[:12]}...)")

        if v2_path.exists():
            v2_data = load_contract_file(v2_path)
            cv2 = get_or_create_contract(db, v2_data)
            print(f"Loaded contract: {cv2.contract.table_name} v{cv2.version_str} (hash: {cv2.sha256_hash[:12]}...)")

        # 2. Seed Pipelines
        pipeline_name = "orders_daily_pipeline"
        pipeline = db.query(Pipeline).filter(Pipeline.name == pipeline_name).first()
        if not pipeline:
            pipeline = Pipeline(
                name=pipeline_name,
                description="Production E-Commerce Daily Orders Ingestion, Validation & Aggregation Pipeline",
                schedule_cron="0 2 * * *",
                status="ACTIVE"
            )
            db.add(pipeline)
            db.flush()

            tasks_def = [
                ("validate_contract", "validate", [], 1),
                ("clean_data", "clean", ["validate_contract"], 1),
                ("transform_orders", "transform", ["clean_data"], 2),
                ("aggregate_metrics", "aggregate", ["transform_orders"], 1),
                ("store_results", "store", ["aggregate_metrics"], 2)
            ]

            for t_name, op_type, upstreams, retries in tasks_def:
                task = PipelineTask(
                    pipeline_id=pipeline.id,
                    task_name=t_name,
                    operator_type=op_type,
                    upstream_tasks=upstreams,
                    retry_limit=retries
                )
                db.add(task)

            db.commit()
            print(f"Created Pipeline: {pipeline.name} (ID: {pipeline.id}) with 5 registered DAG tasks.")
        else:
            print(f"Pipeline '{pipeline_name}' already registered.")

        # 3. Generate & Register Dataset
        dataset_path = "data/raw/orders.csv"
        df, sha_hash = generate_orders_dataset(output_path=dataset_path, num_records=500, random_seed=42)
        
        dataset_record = db.query(Dataset).filter(Dataset.name == "orders_reference_dataset").first()
        if not dataset_record:
            dataset_record = Dataset(
                name="orders_reference_dataset",
                file_path=dataset_path,
                row_count=len(df),
                column_count=len(df.columns),
                columns_list=list(df.columns),
                sha256_hash=sha_hash,
                is_synthetic=True
            )
            db.add(dataset_record)
            db.commit()
            print(f"Registered Reference Dataset: {dataset_record.name} (rows: {dataset_record.row_count}, hash: {sha_hash[:12]}...)")
        else:
            print(f"Dataset '{dataset_record.name}' already registered.")

        # Audit Log
        audit = AuditLog(
            action="SYSTEM_SEEDED",
            resource="system",
            user_or_system="SYSTEM",
            result="SUCCESS",
            details={"pipeline": pipeline_name, "dataset": dataset_path}
        )
        db.add(audit)
        db.commit()

        print("--- SEEDING COMPLETE (NO FAKE RUN DATA CREATED) ---")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
