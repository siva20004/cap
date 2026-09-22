from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app import models, schemas
from app.auth_utils import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user account with first name, last name, email, and password."""
    # Normalize email
    email_clean = payload.email.strip().lower()
    
    # Check if user already exists
    existing = db.query(models.User).filter(models.User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
    
    # Validate password length
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )
    
    hashed_pwd = get_password_hash(payload.password)
    new_user = models.User(
        email=email_clean,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        country=payload.country or "United States",
        hashed_password=hashed_pwd,
        role="ENGINEER",
        is_active=True
    )
    db.add(new_user)
    
    # Audit log
    audit = models.AuditLog(
        action="USER_REGISTER",
        resource="User",
        resource_id=new_user.id,
        user_or_system=email_clean,
        result="SUCCESS",
        details={"email": email_clean, "first_name": payload.first_name, "last_name": payload.last_name}
    )
    db.add(audit)
    
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=schemas.TokenResponse)
def login_user(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password, returning a JWT bearer token."""
    email_clean = payload.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email_clean).first()
    
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact administrator."
        )
    
    token_data = {
        "sub": user.id,
        "email": user.email,
        "name": f"{user.first_name} {user.last_name}",
        "role": user.role
    }
    access_token = create_access_token(data=token_data)
    
    # Audit log
    audit = models.AuditLog(
        action="USER_LOGIN",
        resource="User",
        resource_id=user.id,
        user_or_system=email_clean,
        result="SUCCESS",
        details={"email": email_clean, "ip": "local"}
    )
    db.add(audit)
    db.commit()
    
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.model_validate(user)
    )


@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    """Retrieve the currently authenticated user profile."""
    return current_user
