import os
import sys
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import joblib
from pathlib import Path
from sklearn.ensemble import IsolationForest
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from datetime import datetime

# Add backend to sys.path
workspace_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(workspace_root / "backend"))

from app.database import SessionLocal, init_db
from app.models import ModelVersion, AuditLog
from app.anomaly.lstm_model import TelemetryLSTMNet

def train_models(seed: int = 42, epochs: int = 20, batch_size: int = 32):
    torch.manual_seed(seed)
    np.random.seed(seed)

    data_file = Path("ml/datasets/telemetry_sequences.npz")
    if not data_file.exists():
        print("Telemetry sequences dataset not found. Generating now...")
        from ml.generate_dataset import generate_lstm_sequences
        generate_lstm_sequences(seed=seed)

    data = np.load(data_file)
    X = data["X"]  # (N, seq_len, 5)
    y = data["y"]  # (N,)

    # Train / Val Split (80/20)
    n_samples = len(X)
    split_idx = int(n_samples * 0.8)
    indices = np.random.permutation(n_samples)
    train_idx, val_idx = indices[:split_idx], indices[split_idx:]

    X_train, y_train = X[train_idx], y[train_idx]
    X_val, y_val = X[val_idx], y[val_idx]

    # Compute normalization statistics on training set
    means = np.mean(X_train, axis=(0, 1), keepdims=True)
    stds = np.std(X_train, axis=(0, 1), keepdims=True) + 1e-6

    X_train_norm = (X_train - means) / stds
    X_val_norm = (X_val - means) / stds

    # 1. Train LSTM Model
    print(f"--- Training Temporal LSTM Anomaly Detector ({epochs} epochs) ---")
    model = TelemetryLSTMNet(input_dim=5, hidden_dim=32, num_layers=2, output_dim=1)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.003, weight_decay=1e-5)

    train_tensor_x = torch.tensor(X_train_norm, dtype=torch.float32)
    train_tensor_y = torch.tensor(y_train, dtype=torch.float32).unsqueeze(1)

    for epoch in range(1, epochs + 1):
        model.train()
        permutation = torch.randperm(train_tensor_x.size(0))
        epoch_loss = 0.0

        for i in range(0, train_tensor_x.size(0), batch_size):
            batch_indices = permutation[i:i + batch_size]
            b_x, b_y = train_tensor_x[batch_indices], train_tensor_y[batch_indices]

            optimizer.zero_grad()
            preds = model(b_x)
            loss = criterion(preds, b_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()

        if epoch % 5 == 0 or epoch == epochs:
            print(f"Epoch {epoch:02d}/{epochs:02d} - Loss: {epoch_loss:.4f}")

    # Evaluate LSTM
    model.eval()
    val_tensor_x = torch.tensor(X_val_norm, dtype=torch.float32)
    with torch.no_grad():
        val_preds_prob = model(val_tensor_x).squeeze().numpy()

    val_preds_binary = (val_preds_prob >= 0.5).astype(int)
    lstm_acc = float(accuracy_score(y_val, val_preds_binary))
    lstm_prec = float(precision_score(y_val, val_preds_binary, zero_division=0))
    lstm_rec = float(recall_score(y_val, val_preds_binary, zero_division=0))
    lstm_f1 = float(f1_score(y_val, val_preds_binary, zero_division=0))

    print(f"LSTM Validation: Acc={lstm_acc:.4f}, Prec={lstm_prec:.4f}, Rec={lstm_rec:.4f}, F1={lstm_f1:.4f}")

    models_dir = Path("ml/models")
    models_dir.mkdir(parents=True, exist_ok=True)
    lstm_model_path = models_dir / "lstm_anomaly.pt"

    torch.save({
        "state_dict": model.state_dict(),
        "threshold": 0.5,
        "means": means,
        "stds": stds,
        "input_dim": 5,
        "hidden_dim": 32
    }, lstm_model_path)
    print(f"Saved PyTorch LSTM model weights -> {lstm_model_path}")

    # 2. Train Isolation Forest Baseline
    print("--- Training Isolation Forest Baseline Detector ---")
    X_train_flat = X_train[:, -1, :]  # Last step features
    X_val_flat = X_val[:, -1, :]

    iso_forest = IsolationForest(contamination=0.33, random_state=seed)
    iso_forest.fit(X_train_flat)

    if_val_preds = iso_forest.predict(X_val_flat)
    if_binary = (if_val_preds == -1).astype(int)
    if_acc = float(accuracy_score(y_val, if_binary))
    if_f1 = float(f1_score(y_val, if_binary, zero_division=0))
    print(f"Isolation Forest Validation: Acc={if_acc:.4f}, F1={if_f1:.4f}")

    if_path = models_dir / "isolation_forest.pkl"
    joblib.dump(iso_forest, if_path)
    print(f"Saved Isolation Forest model -> {if_path}")

    # Record in PostgreSQL
    init_db()
    db = SessionLocal()
    try:
        # LSTM Model record
        db_lstm = db.query(ModelVersion).filter(ModelVersion.model_name == "lstm_anomaly_detector").first()
        if not db_lstm:
            db_lstm = ModelVersion(
                model_name="lstm_anomaly_detector",
                version="1.0.0",
                model_type="LSTM_ANOMALY",
                training_dataset=str(data_file),
                features_list=["cpu_percent", "memory_mb", "latency_ms", "throughput_rps", "error_rate"],
                evaluation_metrics={"accuracy": lstm_acc, "precision": lstm_prec, "recall": lstm_rec, "f1_score": lstm_f1},
                file_path=str(lstm_model_path),
                status="TRAINED",
                trained_at=datetime.utcnow()
            )
            db.add(db_lstm)
        else:
            db_lstm.evaluation_metrics = {"accuracy": lstm_acc, "precision": lstm_prec, "recall": lstm_rec, "f1_score": lstm_f1}
            db_lstm.trained_at = datetime.utcnow()
            db_lstm.status = "TRAINED"

        # Isolation Forest record
        db_if = db.query(ModelVersion).filter(ModelVersion.model_name == "isolation_forest_baseline").first()
        if not db_if:
            db_if = ModelVersion(
                model_name="isolation_forest_baseline",
                version="1.0.0",
                model_type="ISOLATION_FOREST",
                training_dataset=str(data_file),
                features_list=["cpu_percent", "memory_mb", "latency_ms", "throughput_rps", "error_rate"],
                evaluation_metrics={"accuracy": if_acc, "f1_score": if_f1},
                file_path=str(if_path),
                status="TRAINED",
                trained_at=datetime.utcnow()
            )
            db.add(db_if)
        else:
            db_if.evaluation_metrics = {"accuracy": if_acc, "f1_score": if_f1}
            db_if.trained_at = datetime.utcnow()
            db_if.status = "TRAINED"

        # Audit
        audit = AuditLog(
            action="MODEL_TRAINED",
            resource="models",
            user_or_system="SYSTEM",
            result="SUCCESS",
            details={"lstm_acc": lstm_acc, "isolation_forest_acc": if_acc}
        )
        db.add(audit)
        db.commit()
        print("Models and evaluation metrics persisted to PostgreSQL!")
    finally:
        db.close()

if __name__ == "__main__":
    train_models()
