from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
import pandas as pd

from app.database import get_db
from app.models import Contract, ContractVersion, ContractViolation
from app.schemas import (
    ContractCreate,
    ContractResponse,
    ContractVersionCreate,
    ContractVersionResponse,
    ContractValidateRequest,
    ContractViolationResponse,
    ContractValidationResult
)
from app.contracts.schema_loader import get_or_create_contract, load_contract_by_version
from app.contracts.validator import ContractValidator

router = APIRouter(prefix="/contracts", tags=["Data Contracts"])

@router.get("", response_model=List[ContractResponse])
def list_contracts(db: Session = Depends(get_db)):
    return db.query(Contract).order_by(Contract.created_at.desc()).all()

@router.post("", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
def create_contract(data: ContractCreate, db: Session = Depends(get_db)):
    contract_payload = {
        "table_name": data.table_name,
        "version": data.active_version,
        "description": data.description,
        "columns": data.initial_schema
    }
    cv = get_or_create_contract(db, contract_payload)
    return cv.contract

@router.get("/violations", response_model=List[ContractViolationResponse])
def get_contract_violations(run_id: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(ContractViolation)
    if run_id:
        query = query.filter(ContractViolation.run_id == run_id)
    return query.order_by(ContractViolation.timestamp.desc()).limit(limit).all()

@router.post("/validate", response_model=ContractValidationResult)
def validate_dataset_contract(payload: ContractValidateRequest, db: Session = Depends(get_db)):
    file_path = Path(payload.dataset_file)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Dataset file '{payload.dataset_file}' not found.")

    contract_ver = load_contract_by_version(db, payload.contract_table, payload.version)
    if not contract_ver:
        raise HTTPException(status_code=404, detail=f"Contract for table '{payload.contract_table}' version '{payload.version}' not found.")

    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV: {str(e)}")

    validator = ContractValidator(contract_ver)
    result = validator.validate_dataframe(df, db=db)
    return result
