import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import ContractViolation, ContractVersion

class ContractValidator:
    def __init__(self, contract_version: ContractVersion):
        self.contract_version = contract_version
        self.schema_data = contract_version.schema_definition
        self.columns_spec = self.schema_data.get("columns", {})

    def validate_dataframe(self, df: pd.DataFrame, run_id: Optional[str] = None, db: Optional[Session] = None) -> Dict[str, Any]:
        violations: List[Dict[str, Any]] = []

        actual_columns = set(df.columns)
        expected_columns = set(self.columns_spec.keys())

        # 1. Missing Required Columns
        for col_name, spec in self.columns_spec.items():
            if spec.get("required", False) and col_name not in actual_columns:
                violations.append({
                    "rule_type": "missing_column",
                    "column_name": col_name,
                    "severity": "CRITICAL",
                    "invalid_rows_count": len(df),
                    "violation_details": f"Required column '{col_name}' is missing from the dataset."
                })

        # 2. Check each present column against contract constraints
        for col_name in actual_columns:
            if col_name not in self.columns_spec:
                violations.append({
                    "rule_type": "extra_column",
                    "column_name": col_name,
                    "severity": "WARNING",
                    "invalid_rows_count": len(df),
                    "violation_details": f"Unexpected column '{col_name}' found in dataset not declared in contract."
                })
                continue

            spec = self.columns_spec[col_name]
            series = df[col_name]

            # 3. Null Values Check
            if not spec.get("nullable", True):
                null_count = int(series.isnull().sum())
                if null_count > 0:
                    violations.append({
                        "rule_type": "null_violation",
                        "column_name": col_name,
                        "severity": "CRITICAL",
                        "invalid_rows_count": null_count,
                        "violation_details": f"Column '{col_name}' contains {null_count} null/missing values where nullable=False."
                    })

            # 4. Uniqueness Check
            if spec.get("unique", False):
                non_nulls = series.dropna()
                dup_count = int(non_nulls.duplicated().sum())
                if dup_count > 0:
                    violations.append({
                        "rule_type": "duplicate_record",
                        "column_name": col_name,
                        "severity": "CRITICAL",
                        "invalid_rows_count": dup_count,
                        "violation_details": f"Column '{col_name}' has {dup_count} duplicate values where unique=True."
                    })

            # 5. Data Type and Value Range Validations
            expected_type = spec.get("type")
            valid_values = series.dropna()

            if expected_type == "integer":
                # Check for non-numeric or non-integer values
                non_int_count = 0
                for val in valid_values:
                    try:
                        f_val = float(val)
                        if not f_val.is_integer():
                            non_int_count += 1
                    except (ValueError, TypeError):
                        non_int_count += 1

                if non_int_count > 0:
                    violations.append({
                        "rule_type": "wrong_datatype",
                        "column_name": col_name,
                        "severity": "CRITICAL",
                        "invalid_rows_count": non_int_count,
                        "violation_details": f"Column '{col_name}' contains {non_int_count} values that cannot be parsed as integer."
                    })
                else:
                    # Check min / max if numeric
                    numeric_series = pd.to_numeric(valid_values, errors="coerce")
                    min_val = spec.get("minimum")
                    if min_val is not None:
                        below_min = int((numeric_series < min_val).sum())
                        if below_min > 0:
                            violations.append({
                                "rule_type": "range_violation",
                                "column_name": col_name,
                                "severity": "CRITICAL",
                                "invalid_rows_count": below_min,
                                "violation_details": f"Column '{col_name}' has {below_min} values below minimum {min_val}."
                            })

            elif expected_type == "float":
                non_float_count = 0
                for val in valid_values:
                    try:
                        float(val)
                    except (ValueError, TypeError):
                        non_float_count += 1

                if non_float_count > 0:
                    violations.append({
                        "rule_type": "wrong_datatype",
                        "column_name": col_name,
                        "severity": "CRITICAL",
                        "invalid_rows_count": non_float_count,
                        "violation_details": f"Column '{col_name}' contains {non_float_count} non-float values."
                    })
                else:
                    numeric_series = pd.to_numeric(valid_values, errors="coerce")
                    min_val = spec.get("minimum")
                    if min_val is not None:
                        below_min = int((numeric_series < min_val).sum())
                        if below_min > 0:
                            violations.append({
                                "rule_type": "range_violation",
                                "column_name": col_name,
                                "severity": "CRITICAL",
                                "invalid_rows_count": below_min,
                                "violation_details": f"Column '{col_name}' has {below_min} values below minimum {min_val}."
                            })

            elif expected_type == "date":
                date_fmt = spec.get("date_format", "%Y-%m-%d")
                invalid_dates = 0
                for val in valid_values:
                    try:
                        datetime.strptime(str(val), date_fmt)
                    except (ValueError, TypeError):
                        invalid_dates += 1
                if invalid_dates > 0:
                    violations.append({
                        "rule_type": "wrong_datatype",
                        "column_name": col_name,
                        "severity": "CRITICAL",
                        "invalid_rows_count": invalid_dates,
                        "violation_details": f"Column '{col_name}' contains {invalid_dates} dates not matching format {date_fmt}."
                    })

        # Save to database if session provided
        if db:
            for v in violations:
                db_record = ContractViolation(
                    run_id=run_id,
                    contract_version_id=self.contract_version.id,
                    rule_type=v["rule_type"],
                    column_name=v.get("column_name"),
                    violation_details=v["violation_details"],
                    severity=v["severity"],
                    invalid_rows_count=v["invalid_rows_count"]
                )
                db.add(db_record)
            db.commit()

        is_valid = len([v for v in violations if v["severity"] == "CRITICAL"]) == 0

        return {
            "is_valid": is_valid,
            "total_violations": len(violations),
            "contract_version": self.contract_version.version_str,
            "violations": violations
        }
