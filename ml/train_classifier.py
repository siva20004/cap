import os
import sys
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, top_k_accuracy_score, classification_report
from sklearn.model_selection import train_test_split

# Add backend to sys.path
workspace_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(workspace_root / "backend"))

from app.database import SessionLocal, init_db
from app.models import ModelVersion, AuditLog
from app.diagnosis.features import FEATURE_NAMES

def train_classifier(seed: int = 42):
    np.random.seed(seed)
    data_path = Path("ml/datasets/diagnosis_training_data.csv")
    if not data_path.exists():
        print("Dataset not found. Generating now...")
        from ml.generate_dataset import generate_classification_dataset
        generate_classification_dataset(seed=seed)

    df = pd.read_csv(data_path)
    X = df[FEATURE_NAMES].values
    y = df["root_cause"].values

    classes = sorted(list(set(y)))
    class_to_idx = {c: i for i, c in enumerate(classes)}
    y_idx = np.array([class_to_idx[c] for c in y])

    X_train, X_val, y_train, y_val, y_train_idx, y_val_idx = train_test_split(
        X, y, y_idx, test_size=0.2, random_state=seed, stratify=y
    )

    print(f"--- Training AI Root-Cause Classifier on {len(X_train)} samples across {len(classes)} classes ---")
    clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=seed, class_weight="balanced")
    clf.fit(X_train, y_train)

    val_preds = clf.predict(X_val)
    val_probs = clf.predict_proba(X_val)

    top1_acc = float(accuracy_score(y_val, val_preds))
    top3_acc = float(top_k_accuracy_score(y_val_idx, val_probs, k=3, labels=np.arange(len(classes))))

    print(f"Random Forest Validation Results:")
    print(f"  Top-1 Accuracy: {top1_acc * 100:.2f}%")
    print(f"  Top-3 Accuracy: {top3_acc * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_val, val_preds))

    # Save model bundle
    models_dir = Path("ml/models")
    models_dir.mkdir(parents=True, exist_ok=True)
    out_file = models_dir / "cause_classifier.joblib"

    joblib.dump({
        "model": clf,
        "classes": clf.classes_.tolist(),
        "feature_names": FEATURE_NAMES,
        "version": "1.0.0",
        "trained_at": datetime.utcnow().isoformat()
    }, out_file)
    print(f"Saved classifier bundle -> {out_file}")

    # Persist in PostgreSQL
    init_db()
    db = SessionLocal()
    try:
        mv = db.query(ModelVersion).filter(ModelVersion.model_name == "root_cause_classifier").first()
        metrics = {
            "top1_accuracy": round(top1_acc, 4),
            "top3_accuracy": round(top3_acc, 4),
            "classes": clf.classes_.tolist(),
            "n_samples": len(df)
        }
        if not mv:
            mv = ModelVersion(
                model_name="root_cause_classifier",
                version="1.0.0",
                model_type="CAUSE_CLASSIFIER",
                training_dataset=str(data_path),
                features_list=FEATURE_NAMES,
                evaluation_metrics=metrics,
                file_path=str(out_file),
                status="TRAINED",
                trained_at=datetime.utcnow()
            )
            db.add(mv)
        else:
            mv.evaluation_metrics = metrics
            mv.trained_at = datetime.utcnow()
            mv.status = "TRAINED"

        audit = AuditLog(
            action="MODEL_TRAINED",
            resource="models",
            user_or_system="SYSTEM",
            result="SUCCESS",
            details=metrics
        )
        db.add(audit)
        db.commit()
        print("Root-cause classifier saved and registered to PostgreSQL!")
    finally:
        db.close()

if __name__ == "__main__":
    train_classifier()
