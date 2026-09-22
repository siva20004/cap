import time
import json
from pathlib import Path
import pandas as pd
from typing import Optional, Dict, Any

from app.pipeline.task import PipelineTaskOperator, TaskContext, TaskResult
from app.contracts.validator import ContractValidator
from app.contracts.schema_loader import load_contract_by_version
from app.pipeline.oracle import IndependentOracle
from app.database import SessionLocal

class ValidateContractOperator(PipelineTaskOperator):
    def __init__(self, task_name="validate_contract", upstream_tasks=None):
        super().__init__(task_name, "validate", upstream_tasks or [])

    def execute(self, context: TaskContext) -> TaskResult:
        file_path = Path(context.input_file)
        if not file_path.exists():
            raise FileNotFoundError(f"Input file not found: {file_path}")

        df = pd.read_csv(file_path)
        scenario = context.failure_scenario

        # Inject controlled failure into dataframe if requested for this scenario
        if scenario == "missing_column" and "price" in df.columns:
            context.log("Injecting failure: removing required column 'price'")
            df = df.drop(columns=["price"])
        elif scenario == "wrong_datatype" and "price" in df.columns:
            context.log("Injecting failure: corrupting 'price' to string 'invalid_price'")
            df.loc[0:5, "price"] = "invalid_price"
        elif scenario == "null_violation" and "order_id" in df.columns:
            context.log("Injecting failure: setting 'order_id' to null")
            df.loc[0:2, "order_id"] = None
        elif scenario == "duplicate_record" and len(df) > 0:
            context.log("Injecting failure: adding duplicate order_id records")
            duplicate_row = df.iloc[0:1].copy()
            df = pd.concat([df, duplicate_row], ignore_index=True)
        elif scenario == "invalid_value" and "quantity" in df.columns:
            context.log("Injecting failure: negative quantity value -50")
            df.loc[0, "quantity"] = -50
        elif scenario == "schema_change" and "order_date" in df.columns:
            context.log("Injecting failure: renaming 'order_date' to 'timestamp_utc'")
            df = df.rename(columns={"order_date": "timestamp_utc"})

        # Load contract
        db = SessionLocal()
        try:
            contract_version_str = context.parameters.get("contract_version", "1.0")
            contract_ver = load_contract_by_version(db, "orders", contract_version_str)
            if not contract_ver:
                raise ValueError(f"Contract 'orders' version '{contract_version_str}' not found in database.")

            validator = ContractValidator(contract_ver)
            val_result = validator.validate_dataframe(df, run_id=context.run_id, db=db)

            if not val_result["is_valid"]:
                critical_errs = [v["violation_details"] for v in val_result["violations"] if v["severity"] == "CRITICAL"]
                err_msg = " | ".join(critical_errs)
                raise ValueError(f"Contract validation failed with {len(critical_errs)} critical violations: {err_msg}")

            context.data = df
            return TaskResult(
                task_name=self.task_name,
                status="SUCCESS",
                duration_seconds=0.0,
                cpu_usage_pct=0.0,
                memory_mb=0.0,
                rows_processed=len(df),
                output_data=df,
                metadata={"contract_version": contract_version_str, "validation": val_result}
            )
        finally:
            db.close()


class CleanDataOperator(PipelineTaskOperator):
    def __init__(self, task_name="clean_data", upstream_tasks=None):
        super().__init__(task_name, "clean", upstream_tasks or ["validate_contract"])

    def execute(self, context: TaskContext) -> TaskResult:
        if context.failure_scenario == "upstream_dependency":
            raise RuntimeError("Upstream dependency simulated crash: database connection reset by peer during data cleaning.")

        df: pd.DataFrame = context.data
        if df is None:
            raise ValueError("No dataframe found in context from previous task.")

        initial_count = len(df)
        # Drop duplicates and na
        cleaned_df = df.dropna().drop_duplicates()
        # Convert numeric types
        cleaned_df["quantity"] = pd.to_numeric(cleaned_df["quantity"]).astype(int)
        cleaned_df["price"] = pd.to_numeric(cleaned_df["price"]).astype(float)
        cleaned_df["order_id"] = cleaned_df["order_id"].astype(str).str.strip()
        cleaned_df["customer_id"] = cleaned_df["customer_id"].astype(str).str.strip()
        cleaned_df["product_id"] = cleaned_df["product_id"].astype(str).str.strip()

        context.data = cleaned_df
        context.log(f"Cleaned data: {initial_count} -> {len(cleaned_df)} rows.")

        return TaskResult(
            task_name=self.task_name,
            status="SUCCESS",
            duration_seconds=0.0,
            cpu_usage_pct=0.0,
            memory_mb=0.0,
            rows_processed=len(cleaned_df),
            output_data=cleaned_df
        )


class TransformOrdersOperator(PipelineTaskOperator):
    def __init__(self, task_name="transform_orders", upstream_tasks=None):
        super().__init__(task_name, "transform", upstream_tasks or ["clean_data"])

    def execute(self, context: TaskContext) -> TaskResult:
        df: pd.DataFrame = context.data
        if df is None:
            raise ValueError("No dataframe found in context.")

        if context.failure_scenario == "timeout":
            context.log("Simulating timeout threshold breach: task running past max allowed time limit...")
            time.sleep(2.5)
            raise TimeoutError("Task 'transform_orders' timed out after exceeding allocated execution threshold (simulated timeout).")

        if context.failure_scenario == "resource_constraint":
            context.log("Simulating resource constraint breach: memory limit exceeded.")
            raise MemoryError("Process killed: Container exceeded memory limit (OOMKilled - 8192MB threshold).")

        df = df.copy()
        df["item_total"] = df["quantity"] * df["price"]
        df["order_date"] = pd.to_datetime(df["order_date"]).dt.strftime("%Y-%m-%d")

        context.data = df
        context.log(f"Transformed orders: computed item_total across {len(df)} rows.")

        return TaskResult(
            task_name=self.task_name,
            status="SUCCESS",
            duration_seconds=0.0,
            cpu_usage_pct=0.0,
            memory_mb=0.0,
            rows_processed=len(df),
            output_data=df
        )


class AggregateMetricsOperator(PipelineTaskOperator):
    def __init__(self, task_name="aggregate_metrics", upstream_tasks=None):
        super().__init__(task_name, "aggregate", upstream_tasks or ["transform_orders"])

    def execute(self, context: TaskContext) -> TaskResult:
        df: pd.DataFrame = context.data
        if df is None:
            raise ValueError("No dataframe found in context.")

        total_orders = int(df["order_id"].nunique())
        total_sales = round(float(df["item_total"].sum()), 2)
        avg_order_value = round(float(total_sales / total_orders), 2) if total_orders > 0 else 0.0

        # Group by partition date
        partition_agg = df.groupby("order_date").agg(
            orders_count=("order_id", "nunique"),
            sales=("item_total", "sum"),
            rows=("order_id", "count")
        ).reset_index().to_dict(orient="records")

        aggregates = {
            "total_orders": total_orders,
            "total_sales": total_sales,
            "average_order_value": avg_order_value,
            "total_valid_rows": len(df),
            "partitions": partition_agg
        }

        if context.failure_scenario == "output_validation":
            context.log("Injecting failure: corrupting aggregate total_sales by adding +99999.0 to simulate silent data corruption.")
            aggregates["total_sales"] = round(total_sales + 99999.0, 2)

        context.parameters["aggregates"] = aggregates
        context.log(f"Aggregated metrics: {total_orders} orders, total sales: ${total_sales}, AOV: ${avg_order_value}.")

        return TaskResult(
            task_name=self.task_name,
            status="SUCCESS",
            duration_seconds=0.0,
            cpu_usage_pct=0.0,
            memory_mb=0.0,
            rows_processed=len(df),
            metadata=aggregates
        )


class StoreResultsOperator(PipelineTaskOperator):
    def __init__(self, task_name="store_results", upstream_tasks=None):
        super().__init__(task_name, "store", upstream_tasks or ["aggregate_metrics"])

    def execute(self, context: TaskContext) -> TaskResult:
        aggregates = context.parameters.get("aggregates", {})
        if not aggregates:
            raise ValueError("No aggregates found to store.")

        # Save output result json/csv
        out_dir = Path("data/processed")
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / f"result_{context.run_id}.json"

        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(aggregates, f, indent=2)

        context.output_file = str(out_file)

        # Call Independent Oracle to validate
        is_pass, oracle_summary = IndependentOracle.validate_output(
            actual_output=aggregates,
            raw_csv_path=Path(context.input_file)
        )

        context.parameters["oracle_validation"] = oracle_summary
        context.log(f"Independent Oracle Validation Status: {oracle_summary['validation_status']}")

        if not is_pass:
            raise ValueError(f"Independent Oracle Validation Failed! Discrepancies detected: {oracle_summary['discrepancies']}")

        return TaskResult(
            task_name=self.task_name,
            status="SUCCESS",
            duration_seconds=0.0,
            cpu_usage_pct=0.0,
            memory_mb=0.0,
            rows_processed=aggregates.get("total_valid_rows", 0),
            metadata={"output_file": str(out_file), "oracle_summary": oracle_summary}
        )
