import torch
import torch.nn as nn
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Any, Optional

class TelemetryLSTMNet(nn.Module):
    def __init__(self, input_dim: int = 5, hidden_dim: int = 32, num_layers: int = 2, output_dim: int = 1):
        super(TelemetryLSTMNet, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True, dropout=0.1)
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 16),
            nn.ReLU(),
            nn.Linear(16, output_dim),
            nn.Sigmoid()
        )

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim, device=x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim, device=x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out


class LSTMAnomalyDetector:
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or "ml/models/lstm_anomaly.pt"
        self.model = TelemetryLSTMNet()
        self.is_trained = False
        self.threshold = 0.5
        self.means = None
        self.stds = None
        self.load_model_if_exists()

    def load_model_if_exists(self):
        p = Path(self.model_path)
        if p.exists():
            try:
                checkpoint = torch.load(p, map_location=torch.device("cpu"), weights_only=False)
                self.model.load_state_dict(checkpoint["state_dict"])
                self.model.eval()
                self.threshold = checkpoint.get("threshold", 0.5)
                self.means = checkpoint.get("means")
                self.stds = checkpoint.get("stds")
                self.is_trained = True
            except Exception as e:
                print(f"Warning: Could not load LSTM model from {self.model_path}: {e}")

    def predict_sequence(self, sequence: np.ndarray) -> Dict[str, Any]:
        """
        Infers anomaly score on a (seq_len, 5) telemetry sequence.
        Returns {"is_anomaly": bool, "anomaly_score": float, "status": str}
        """
        if not self.is_trained:
            return {
                "is_anomaly": False,
                "anomaly_score": 0.0,
                "status": "Model not trained",
                "threshold": self.threshold
            }

        # Normalize if scaler stats available
        seq = np.array(sequence, dtype=np.float32)
        if self.means is not None and self.stds is not None:
            m = np.squeeze(self.means)
            s = np.squeeze(self.stds)
            seq = (seq - m) / (s + 1e-6)

        if seq.ndim == 2:
            tensor = torch.tensor(seq, dtype=torch.float32).unsqueeze(0)  # (1, seq_len, 5)
        else:
            tensor = torch.tensor(seq, dtype=torch.float32)
        self.model.eval()
        with torch.no_grad():
            score = float(self.model(tensor).item())

        is_anomaly = score >= self.threshold
        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(score, 4),
            "status": "ANOMALY" if is_anomaly else "NORMAL",
            "threshold": self.threshold
        }
