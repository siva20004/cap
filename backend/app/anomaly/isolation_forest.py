import joblib
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional
from sklearn.ensemble import IsolationForest

class IsolationForestBaselineDetector:
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or "ml/models/isolation_forest.pkl"
        self.model: Optional[IsolationForest] = None
        self.is_trained = False
        self.load_model_if_exists()

    def load_model_if_exists(self):
        p = Path(self.model_path)
        if p.exists():
            try:
                self.model = joblib.load(p)
                self.is_trained = True
            except Exception as e:
                print(f"Warning: Could not load Isolation Forest from {self.model_path}: {e}")

    def predict_point(self, features: list) -> Dict[str, Any]:
        """
        Features: [cpu, memory, latency, throughput, error_rate]
        """
        if not self.is_trained or self.model is None:
            return {
                "is_anomaly": False,
                "anomaly_score": 0.0,
                "status": "Model not trained"
            }

        arr = np.array(features, dtype=np.float32).reshape(1, -1)
        pred = self.model.predict(arr)[0]  # -1 for anomaly, 1 for normal
        score = float(-self.model.score_samples(arr)[0])  # higher score = more anomalous

        is_anomaly = (pred == -1)
        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(score, 4),
            "status": "ANOMALY" if is_anomaly else "NORMAL"
        }
