import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
import models

load_dotenv()

# JWT & Password Hashing Configuration
SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "625fe0355ef98db8298078f4d25bc9583f4a7905650cde6d8fd0d8731667635f")
ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# --- Schemas ---
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    full_name: str


class AdminCreate(BaseModel):
    username: str
    password: str
    full_name: str


class AdminOut(BaseModel):
    id: int
    username: str
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class LoginJsonRequest(BaseModel):
    username: str
    password: str


class ForgotPasswordRequest(BaseModel):
    username: str


class ResetPasswordRequest(BaseModel):
    username: str
    code: str = Field(..., min_length=6, max_length=16)
    new_password: str = Field(..., min_length=8, max_length=100)


# --- In-memory store untuk alur lupa password (tanpa email) ---
# username -> (kode, masa berlaku)
_reset_codes: dict[str, tuple[str, datetime]] = {}
# username -> daftar waktu request (untuk throttle anti-brute-force)
_forgot_attempts: dict[str, list[datetime]] = {}
_reset_attempts: dict[str, list[datetime]] = {}

_RESET_CODE_TTL_MINUTES = 10
_FORGOT_MAX_ATTEMPTS = 3   # per 10 menit per username
_RESET_MAX_ATTEMPTS = 5    # per 15 menit per username


def _is_throttled(store: dict, username: str, max_attempts: int, window_minutes: int) -> bool:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=window_minutes)
    recent = [t for t in store.get(username, []) if t > window_start]
    store[username] = recent
    return len(recent) >= max_attempts


def _record_attempt(store: dict, username: str) -> None:
    store.setdefault(username, []).append(datetime.now(timezone.utc))


# --- Password & Token Utilities ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate bcrypt password hash."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token with expiration."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt: str = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- FastAPI Dependency for Protected Endpoints ---
def get_current_admin(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> models.Admin:
    """Dependency to validate JWT and return authenticated Admin model."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token autentikasi tidak valid atau sudah kedaluwarsa.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    admin: Optional[models.Admin] = (
        db.query(models.Admin).filter(models.Admin.username == username).first()
    )
    if admin is None:
        raise credentials_exception

    return admin


# --- Endpoints ---
@router.post("/login", response_model=TokenResponse)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    """Login endpoint using standard OAuth2 Form (compatible with Swagger UI)."""
    admin = db.query(models.Admin).filter(models.Admin.username == form_data.username).first()
    if not admin or not verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": admin.username})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        username=admin.username,
        full_name=admin.full_name,
    )


@router.post("/login-json", response_model=TokenResponse)
def login_json(
    credentials: LoginJsonRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    """Alternative login endpoint accepting JSON payload for frontend fetch/axios."""
    admin = db.query(models.Admin).filter(models.Admin.username == credentials.username).first()
    if not admin or not verify_password(credentials.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah.",
        )

    access_token = create_access_token(data={"sub": admin.username})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        username=admin.username,
        full_name=admin.full_name,
    )


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Annotated[Session, Depends(get_db)]):
    """Minta kode reset password. Kode DITAMPILKAN DI LOG SERVER (terminal / log Railway),
    bukan dikirim ke email — hanya owner yang bisa mengaksesnya."""
    username = payload.username.strip()
    if _is_throttled(_forgot_attempts, username, _FORGOT_MAX_ATTEMPTS, _RESET_CODE_TTL_MINUTES):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Terlalu banyak permintaan. Coba lagi beberapa menit lagi.",
        )
    _record_attempt(_forgot_attempts, username)

    admin = db.query(models.Admin).filter(models.Admin.username == username).first()
    if admin:
        code = secrets.token_hex(4).upper()  # 8 karakter hex, contoh: A3F9C21B
        _reset_codes[username] = (code, datetime.now(timezone.utc) + timedelta(minutes=_RESET_CODE_TTL_MINUTES))
        # Dicetak ke log server — satu-satunya cara owner membacanya
        print(
            f"\n[AUTH][RESET] Kode reset password untuk '{username}': {code} "
            f"(berlaku {_RESET_CODE_TTL_MINUTES} menit)\n",
            flush=True,
        )

    # Pesan generik — tidak membocorkan apakah username terdaftar atau tidak
    return {
        "message": (
            "Jika username terdaftar, kode reset sudah dibuat. "
            "Minta owner membaca kode di log server (terminal lokal / tab Logs Railway), "
            "lalu masukkan kode + password baru."
        )
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Annotated[Session, Depends(get_db)]):
    """Reset password menggunakan kode dari log server."""
    username = payload.username.strip()
    if _is_throttled(_reset_attempts, username, _RESET_MAX_ATTEMPTS, 15):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Terlalu banyak percobaan. Coba lagi 15 menit lagi.",
        )
    _record_attempt(_reset_attempts, username)

    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Kode reset tidak valid atau sudah kedaluwarsa.",
    )

    admin = db.query(models.Admin).filter(models.Admin.username == username).first()
    entry = _reset_codes.get(username)
    if not admin or not entry:
        raise invalid

    code, expires_at = entry
    if datetime.now(timezone.utc) > expires_at:
        _reset_codes.pop(username, None)
        raise invalid

    if not secrets.compare_digest(code, payload.code.strip().upper()):
        raise invalid

    admin.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    _reset_codes.pop(username, None)
    return {"message": "Password berhasil diubah. Silakan login dengan password baru."}


@router.get("/me", response_model=AdminOut)
def read_current_admin(
    current_admin: Annotated[models.Admin, Depends(get_current_admin)],
) -> models.Admin:
    """Protected endpoint to retrieve current logged in admin."""
    return current_admin


@router.post("/seed-default-admin", response_model=AdminOut)
def seed_default_admin(db: Annotated[Session, Depends(get_db)]) -> models.Admin:
    """Utility endpoint to seed initial default admin if empty."""
    existing = db.query(models.Admin).filter(models.Admin.username == "admin").first()
    if existing:
        return existing

    default_admin = models.Admin(
        username="admin",
        hashed_password=get_password_hash("admin123"),
        full_name="Super Admin Notta Rent",
    )
    db.add(default_admin)
    db.commit()
    db.refresh(default_admin)
    return default_admin
