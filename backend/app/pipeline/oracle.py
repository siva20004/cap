import csv
import json
import math
from pathlib import Path
from typing import Dict, Any, Tuple
import pandas as pd

class IndependentOracle:
    """
    Independent expected-result calculation engine.
    Completely isolated from the pipeline DAG operators.
    Computes mathematical ground-truth from raw records and verifies against pipeline output.
    """

    @staticmethod
    def compute_expected_aggregates(csv_file_path: Path) -> Dict[str, Any]:
        """
        Uses standard library csv.DictReader to perform independent raw row-by-row
        arithmetic calculations for orders dataset.
        """
        total_orders_set = set()
        total_sales = 0.0
        valid_records_count = 0
        date_partition_counts = {}

        with open(csv_file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    order_id = str(row["order_id"]).strip()
                    qty = int(float(row["quantity"]))
                    price = float(row["price"])
                    order_date = str(row["order_date"]).strip()

                    total_orders_set.add(order_id)
                    line_total = qty * price
                    total_sales += line_total
                    valid_records_count += 1

                    date_partition_counts[order_date] = date_partition_counts.get(order_date, 0) + 1
                except Exception:
                    # Malformed raw rows are omitted by oracle computation
                    continue

        total_orders = len(total_orders_set)
        avg_order_value = (total_sales / total_orders) if total_orders > 0 else 0.0

        return {
            "total_orders": total_orders,
            "total_sales": round(total_sales, 2),
            "average_order_value": round(avg_order_value, 2),
            "total_valid_rows": valid_records_count,
            "date_partitions": date_partition_counts
        }

    @classmethod
    def validate_output(cls, actual_output: Dict[str, Any], raw_csv_path: Path) -> Tuple[bool, Dict[str, Any]]:
        """
        Validates the actual pipeline output against the independently computed expected output.
        Returns (is_match: bool, diff_summary: Dict).
        """
        expected = cls.compute_expected_aggregates(raw_csv_path)

        diffs = {}
        tolerance = 0.01

        # Check total_orders
        actual_orders = actual_output.get("total_orders", 0)
        expected_orders = expected["total_orders"]
        if actual_orders != expected_orders:
            diffs["total_orders"] = {
                "expected": expected_orders,
                "actual": actual_orders,
                "diff": actual_orders - expected_orders
            }

        # Check total_sales
        actual_sales = float(actual_output.get("total_sales", 0.0))
        expected_sales = float(expected["total_sales"])
        if abs(actual_sales - expected_sales) > tolerance:
            diffs["total_sales"] = {
                "expected": expected_sales,
                "actual": actual_sales,
                "diff": round(actual_sales - expected_sales, 2)
            }

        # Check average_order_value
        actual_aov = float(actual_output.get("average_order_value", 0.0))
        expected_aov = float(expected["average_order_value"])
        if abs(actual_aov - expected_aov) > tolerance:
            diffs["average_order_value"] = {
                "expected": expected_aov,
                "actual": actual_aov,
                "diff": round(actual_aov - expected_aov, 2)
            }

        is_match = (len(diffs) == 0)

        summary = {
            "validation_status": "PASS" if is_match else "FAIL",
            "expected_result": expected,
            "actual_result": actual_output,
            "discrepancies": diffs,
            "is_equal": is_match
        }

        return is_match, summary
