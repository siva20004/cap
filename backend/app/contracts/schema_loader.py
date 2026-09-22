import json
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Contract, ContractVersion
from app.config import settings

def compute_hash(data: Any) -> str:
    serialized = json.dumps(data, sort_keys=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

def load_contract_file(file_path: Path) -> Dict[str, Any]:
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_or_create_contract(db: Session, contract_data: Dict[str, Any]) -> ContractVersion:
    table_name = contract_data["table_name"]
    version_str = str(contract_data.get("version", "1.0"))
    schema_def = contract_data.get("columns", {})
    sha_hash = compute_hash(contract_data)

    contract = db.query(Contract).filter(Contract.table_name == table_name).first()
    if not contract:
        contract = Contract(
            table_name=table_name,
            description=contract_data.get("description", f"Contract for {table_name}"),
            active_version=version_str
        )
        db.add(contract)
        db.flush()

    # Check if this specific version already exists
    contract_version = db.query(ContractVersion).filter(
        ContractVersion.contract_id == contract.id,
        ContractVersion.version_str == version_str
    ).first()

    if not contract_version:
        contract_version = ContractVersion(
            contract_id=contract.id,
            version_str=version_str,
            schema_definition=contract_data,
            sha256_hash=sha_hash
        )
        db.add(contract_version)
        contract.active_version = version_str
        db.commit()
        db.refresh(contract_version)

    return contract_version

def load_contract_by_version(db: Session, table_name: str, version_str: Optional[str] = None) -> Optional[ContractVersion]:
    contract = db.query(Contract).filter(Contract.table_name == table_name).first()
    if not contract:
        return None
    target_version = version_str or contract.active_version
    return db.query(ContractVersion).filter(
        ContractVersion.contract_id == contract.id,
        ContractVersion.version_str == target_version
    ).first()
