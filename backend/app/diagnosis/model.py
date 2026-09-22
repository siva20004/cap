import joblib
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import Failure, Diagnosis, DiagnosisEvidence, PipelineMetric
from app.diagnosis.features import FeatureExtractor, FEATURE_NAMES
from app.diagnosis.rules import RuleBasedDiagnosisBaseline
from app.diagnosis.evidence import EvidenceCollector
from app.anomaly.detector import AnomalyDetectionService

class RootCauseClassifierService:
    def __init__(self, model_path: str = "ml/models/cause_classifier.joblib"):
        self.model_path = model_path
        self.model = None
        self.classes = []
        self.is_trained = False
        self.model_version = "1.0.0"
        self.anomaly_service = AnomalyDetectionService()
        self.load_model_if_exists()

    def load_model_if_exists(self):
        p = Path(self.model_path)
        if p.exists():
            try:
                bundle = joblib.load(p)
                self.model = bundle["model"]
                self.classes = bundle["classes"]
                self.model_version = bundle.get("version", "1.0.0")
                self.is_trained = True
            except Exception as e:
                print(f"Warning: Could not load classifier from {self.model_path}: {e}")

    def diagnose_failure(self, db: Session, failure: Failure) -> Diagnosis:
        # 1. Extract feature vector from actual database failure records
        features_dict = FeatureExtractor.extract_features_from_failure(db, failure)
        feature_vector = [features_dict[name] for name in FEATURE_NAMES]

        # 2. Run Baseline Rule Diagnosis
        baseline_cause, baseline_conf, baseline_evidence = RuleBasedDiagnosisBaseline.diagnose(features_dict)

        # 3. Run AI ML Classifier Inference
        if not self.is_trained or self.model is None:
            # Model not trained state
            predicted_cause = baseline_cause
            confidence = baseline_conf
            ranked_causes = [{"cause": baseline_cause, "probability": baseline_conf}]
            model_ver = "Model not trained (Baseline Fallback)"
        else:
            X = np.array([feature_vector], dtype=np.float32)
            probs = self.model.predict_proba(X)[0]
            # Pair classes with probabilities
            cause_prob_pairs = []
            for idx, c in enumerate(self.classes):
                cause_prob_pairs.append({
                    "cause": str(c),
                    "probability": round(float(probs[idx]), 4)
                })
            # Rank causes descending
            cause_prob_pairs.sort(key=lambda x: x["probability"], reverse=True)
            ranked_causes = cause_prob_pairs
            predicted_cause = ranked_causes[0]["cause"]
            confidence = ranked_causes[0]["probability"]
            model_ver = self.model_version

        # 4. Run LSTM Temporal Anomaly Detection
        metrics = db.query(PipelineMetric).filter(PipelineMetric.run_id == failure.run_id).all()
        telemetry_dicts = [
            {
                "cpu_percent": m.cpu_percent,
                "memory_mb": m.memory_mb,
                "latency_ms": m.latency_ms,
                "throughput_rps": m.throughput_rps,
                "error_rate": m.error_rate
            }
            for m in metrics
        ]
        anomaly_analysis = self.anomaly_service.analyze_run_telemetry(telemetry_dicts)

        # 5. Extract Concrete Evidence
        evidence_items = EvidenceCollector.collect_evidence(db, failure, features_dict)
        evidence_descriptions = [e["description"] for e in evidence_items]

        # 6. Save Diagnosis record in PostgreSQL
        diagnosis = Diagnosis(
            failure_id=failure.id,
            model_version=model_ver,
            baseline_cause=baseline_cause,
            predicted_cause=predicted_cause,
            confidence=confidence,
            ranked_causes=ranked_causes,
            features=features_dict,
            evidence=evidence_descriptions,
            anomaly_status=anomaly_analysis["lstm_status"],
            anomaly_score=anomaly_analysis["lstm_anomaly_score"],
            timestamp=datetime.utcnow()
        )
        db.add(diagnosis)
        db.flush()

        for item in evidence_items:
            ev_rec = DiagnosisEvidence(
                diagnosis_id=diagnosis.id,
                evidence_type=item["evidence_type"],
                rule_or_metric=item["rule_or_metric"],
                observed_value=str(item["observed_value"]),
                expected_value=str(item.get("expected_value", "")),
                description=item["description"],
                timestamp=datetime.utcnow()
            )
            db.add(ev_rec)

        db.commit()
        db.refresh(diagnosis)
        return diagnosis
