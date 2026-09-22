from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import ModelVersion
from app.schemas import ModelVersionResponse, ModelTrainRequest

router = APIRouter(prefix="/models", tags=["Model Registry"])

@router.get("", response_model=List[ModelVersionResponse])
def list_models(db: Session = Depends(get_db)):
    return db.query(ModelVersion).order_by(ModelVersion.trained_at.desc()).all()

@router.post("/train", response_model=List[ModelVersionResponse])
def trigger_model_training(payload: ModelTrainRequest, db: Session = Depends(get_db)):
    from ml.train_lstm import train_models as train_lstm_models
    from ml.train_classifier import train_classifier
    
    if payload.model_type in ["ALL", "LSTM_ANOMALY", "ISOLATION_FOREST"]:
        train_lstm_models(seed=payload.random_seed, epochs=payload.epochs)
    
    if payload.model_type in ["ALL", "CAUSE_CLASSIFIER"]:
        train_classifier(seed=payload.random_seed)

    return db.query(ModelVersion).order_by(ModelVersion.trained_at.desc()).all()
