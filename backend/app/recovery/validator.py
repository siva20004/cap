from typing import Dict, Any, Tuple
from pathlib import Path
from app.pipeline.oracle import IndependentOracle

class RecoveryValidator:
    @staticmethod
    def verify(actual_output: Dict[str, Any], raw_csv_path: Path) -> Tuple[bool, Dict[str, Any]]:
        return IndependentOracle.validate_output(actual_output, raw_csv_path)
