from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional
import hashlib
import shutil
from pathlib import Path
import pandas as pd
from datetime import datetime

from app.database import get_db
from app.models import Dataset, AuditLog
from app.schemas import DatasetResponse

router = APIRouter(prefix="/datasets", tags=["Datasets"])

@router.get("", response_model=List[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).order_by(Dataset.created_at.desc()).all()

@router.post("/upload", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
def upload_dataset(file: UploadFile = File(...), name: Optional[str] = Form(None), is_synthetic: bool = Form(False), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV datasets are supported.")

    dataset_name = name or file.filename.rsplit(".", 1)[0]
    out_dir = Path("data/raw")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{dataset_name}_{int(datetime.utcnow().timestamp())}.csv"

    with open(out_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Compute SHA-256 and extract metadata
    with open(out_path, "rb") as f:
        sha_hash = hashlib.sha256(f.read()).hexdigest()

    try:
        df = pd.read_csv(out_path)
    except Exception as e:
        if out_path.exists():
            out_path.unlink()
        raise HTTPException(status_code=400, detail=f"Invalid CSV structure: {str(e)}")

    record = Dataset(
        name=dataset_name,
        file_path=str(out_path),
        row_count=len(df),
        column_count=len(df.columns),
        columns_list=list(df.columns),
        sha256_hash=sha_hash,
        is_synthetic=is_synthetic,
        created_at=datetime.utcnow()
    )
    db.add(record)

    audit = AuditLog(
        action="DATASET_UPLOADED",
        resource="datasets",
        resource_id=record.id,
        user_or_system="USER",
        result="SUCCESS",
        details={"name": dataset_name, "rows": len(df), "hash": sha_hash}
    )
    db.add(audit)
    db.commit()
    db.refresh(record)
    return record
