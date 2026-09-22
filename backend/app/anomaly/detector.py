from typing import Dict, Any, List
import numpy as np
from app.anomaly.lstm_model import LSTMAnomalyDetector
from app.anomaly.isolation_forest import IsolationForestBaselineDetector

class AnomalyDetectionService:
    def __init__(self):
        self.lstm_detector = LSTMAnomalyDetector()
        self.if_detector = IsolationForestBaselineDetector()

    def analyze_run_telemetry(self, telemetry_points: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes a sequence of telemetry points from a pipeline run.
        """
        if not telemetry_points:
            return {
                "lstm_status": "Insufficient training data" if not self.lstm_detector.is_trained else "No telemetry recorded",
                "lstm_anomaly_score": 0.0,
                "is_anomalous": False,
                "baseline_isolation_forest": "Model not trained" if not self.if_detector.is_trained else "NORMAL"
            }

        # Format sequence for LSTM: [cpu, memory, latency, throughput, error_rate]
        seq = []
        for p in telemetry_points:
            seq.append([
                float(p.get("cpu_percent", 0.0)),
                float(p.get("memory_mb", 0.0)),
                float(p.get("latency_ms", 0.0)),
                float(p.get("throughput_rps", 0.0)),
                float(p.get("error_rate", 0.0))
            ])

        # If sequence is shorter than 5, pad with the first or repeat
        while len(seq) < 5:
            seq.append(seq[-1] if seq else [0.0, 0.0, 0.0, 0.0, 0.0])

        lstm_res = self.lstm_detector.predict_sequence(np.array(seq))
        last_point = seq[-1]
        if_res = self.if_detector.predict_point(last_point)

        return {
            "lstm_status": lstm_res["status"],
            "lstm_anomaly_score": lstm_res["anomaly_score"],
            "is_anomalous": lstm_res["is_anomaly"],
            "lstm_threshold": lstm_res.get("threshold", 0.5),
            "isolation_forest_status": if_res["status"],
            "isolation_forest_score": if_res["anomaly_score"]
        }
