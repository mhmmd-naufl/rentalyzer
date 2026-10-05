import io
import os
import csv
import json
import requests
import time
from datetime import datetime, timezone, timedelta
from typing import Annotated, List, Optional
from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException, status, Query, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler

import models
import schemas
from database import engine, get_db, Base
from auth import router as auth_router, get_current_admin, get_password_hash

load_dotenv()

# Initialize Database tables
Base.metadata.create_all(bind=engine)


def ensure_device_columns() -> None:
    """Backfill missing hourly pricing columns for older databases before startup queries run."""
    required_columns = {
        "price_3h": "REAL" if engine.url.get_backend_name() == "sqlite" else "DOUBLE PRECISION",
        "price_6h": "REAL" if engine.url.get_backend_name() == "sqlite" else "DOUBLE PRECISION",
        "price_9h": "REAL" if engine.url.get_backend_name() == "sqlite" else "DOUBLE PRECISION",
        "price_12h": "REAL" if engine.url.get_backend_name() == "sqlite" else "DOUBLE PRECISION",
        "price_24h": "REAL" if engine.url.get_backend_name() == "sqlite" else "DOUBLE PRECISION",
    }

    backend_name = engine.url.get_backend_name()
    if backend_name == "sqlite":
        table_check_sql = "PRAGMA table_info(devices)"
        column_name_field = 1
        column_exists_sql = None
    elif backend_name == "postgresql":
        table_check_sql = "SELECT to_regclass('public.devices')"
        column_name_field = 0
        column_exists_sql = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'devices'
        """
    else:
        return

    with engine.begin() as conn:
        if backend_name == "sqlite":
            table_info = conn.exec_driver_sql(table_check_sql).fetchall()
            if not table_info:
                return
            existing_columns = {row[column_name_field] for row in table_info}
        else:
            if not conn.exec_driver_sql(table_check_sql).scalar():
                return
            existing_columns = {
                row[column_name_field]
                for row in conn.exec_driver_sql(column_exists_sql).fetchall()
            }

        for column_name, column_type in required_columns.items():
            if column_name not in existing_columns:
                if backend_name == "sqlite":
                    conn.exec_driver_sql(f"ALTER TABLE devices ADD COLUMN {column_name} {column_type}")
                else:
                    conn.exec_driver_sql(
                        f"ALTER TABLE devices ADD COLUMN {column_name} {column_type}"
                    )


ensure_device_columns()

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(
    title="Notta Rent API",
    description="Sistem Manajemen Sewa Smartphone & Data Pipeline Analitik (Secured)",
    version="1.1.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ==========================================================
# SECURITY MIDDLEWARE 1: HTTP Security Headers
# ==========================================================
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Protect against MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Prevent Clickjacking by disallowing framing
        response.headers["X-Frame-Options"] = "DENY"
        # Enable legacy XSS filter in browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # HTTP Strict Transport Security (HSTS)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)


# ==========================================================
# SECURITY MIDDLEWARE 2: CORS Whitelist Configuration
# ==========================================================
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Include Auth Router
app.include_router(auth_router)

# Health check (dipakai oleh monitoring lokal & healthcheck platform deploy)
@app.get("/health", tags=["System"])
def health_check() -> dict:
    return {"status": "ok", "service": "Notta Rent API", "version": "1.1.0"}

# Serve uploaded images
os.makedirs("uploads/devices", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


def auto_flag_overdue() -> None:
    """Background job: auto-flag transaksi Active yang melewati end_date_expected."""
    db: Session = next(get_db())
    try:
        now = datetime.now(timezone.utc)
        overdue_txs = (
            db.query(models.Transaction)
            .filter(
                models.Transaction.status == models.TransactionStatus.ACTIVE,
                models.Transaction.end_date_expected < now,
            )
            .all()
        )
        for tx in overdue_txs:
            tx.status = models.TransactionStatus.OVERDUE
            if tx.device:
                tx.device.status = models.DeviceStatus.RENTED
        if overdue_txs:
            db.commit()
            print(f"[Scheduler] Auto-flagged {len(overdue_txs)} transaksi sebagai Overdue.")
    except Exception as e:
        print(f"[Scheduler] Error: {e}")
        db.rollback()
    finally:
        db.close()


def _release_stale_booked(db: Session) -> None:
    """Lepas status Booked unit yang hanya diblokir booking Pending kadaluarsa
    (end_date_expected sudah lewat). Booking Active/Overdue tetap memblokir."""
    now = datetime.now()
    stale: List[models.Device] = []
    for device in db.query(models.Device).filter(
        models.Device.status == models.DeviceStatus.BOOKED
    ).all():
        blocking = any(
            tx.status in (models.TransactionStatus.ACTIVE, models.TransactionStatus.OVERDUE)
            or (
                tx.status == models.TransactionStatus.PENDING
                and tx.end_date_expected is not None
                and tx.end_date_expected >= now
            )
            for tx in device.transactions
        )
        if not blocking:
            stale.append(device)
    for device in stale:
        device.status = models.DeviceStatus.AVAILABLE
    if stale:
        db.commit()
        print(f"[AutoRelease] {len(stale)} unit dilepas dari status Booked (booking sudah lewat).")


def _booked_until(device: models.Device) -> Optional[datetime]:
    """Jadwal sewa terakhir yang masih berlaku untuk badge katalog (null jika sudah lewat)."""
    now = datetime.now()
    ends = [
        tx.end_date_expected
        for tx in device.transactions
        if tx.status not in (models.TransactionStatus.COMPLETED, models.TransactionStatus.CANCELED)
        and tx.end_date_expected is not None
        and tx.end_date_expected >= now
    ]
    return max(ends) if ends else None


# Jalankan scheduler overdue setiap 15 menit
_scheduler = BackgroundScheduler()
_scheduler.add_job(auto_flag_overdue, "interval", minutes=15, id="overdue_checker")
_scheduler.start()


# --- Startup Event: Auto Seed Default Admin & Sample Devices if Empty ---
@app.on_event("startup")
def on_startup() -> None:
    db: Session = next(get_db())
    try:
        # 1. Seed Default Admin if not exists
        admin = db.query(models.Admin).filter(models.Admin.username == "admin").first()
        if not admin:
            db.add(models.Admin(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                full_name="Super Admin Notta Rent"
            ))
            db.commit()

        # 2. Seed Initial Devices if empty
        if db.query(models.Device).count() == 0:
            sample_devices = [
                models.Device(
                    brand="Apple",
                    model="iPhone 15 Pro Max 256GB",
                    imei_serial="356891234567890",
                    purchase_price=21500000.0,
                    daily_rent_price=350000.0,
                    color="Natural Titanium",
                    image="https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80",
                    price_3h=180000.0, price_6h=300000.0, price_9h=420000.0, price_12h=580000.0, price_24h=850000.0,
                    status=models.DeviceStatus.AVAILABLE,
                ),
                models.Device(
                    brand="Apple",
                    model="iPhone 13 Pro 128GB",
                    imei_serial="352341234567891",
                    purchase_price=13500000.0,
                    daily_rent_price=200000.0,
                    color="Sierra Blue",
                    image="https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=600&auto=format&fit=crop&q=80",
                    price_3h=90000.0, price_6h=160000.0, price_9h=240000.0, price_12h=320000.0, price_24h=500000.0,
                    status=models.DeviceStatus.AVAILABLE,
                ),
                models.Device(
                    brand="Samsung",
                    model="Galaxy S23 Ultra 512GB",
                    imei_serial="354561234567892",
                    purchase_price=17500000.0,
                    daily_rent_price=300000.0,
                    color="Phantom Black",
                    image="https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&auto=format&fit=crop&q=80",
                    price_3h=140000.0, price_6h=250000.0, price_9h=350000.0, price_12h=470000.0, price_24h=700000.0,
                    status=models.DeviceStatus.AVAILABLE,
                ),
                models.Device(
                    brand="Samsung",
                    model="Galaxy Z Flip 5 256GB",
                    imei_serial="357891234567893",
                    purchase_price=14000000.0,
                    daily_rent_price=250000.0,
                    color="Cream",
                    image="https://images.unsplash.com/photo-1669236493504-8c9fd73c279e?w=600&auto=format&fit=crop&q=80",
                    price_3h=120000.0, price_6h=210000.0, price_9h=310000.0, price_12h=430000.0, price_24h=600000.0,
                    status=models.DeviceStatus.AVAILABLE,
                ),
            ]
            db.add_all(sample_devices)
            db.commit()
    finally:
        db.close()


# ==========================================================
# PUBLIC ENDPOINTS (Customer Facing)
# ==========================================================

@app.get("/api/devices", response_model=List[schemas.DeviceOut], tags=["Devices"])
@limiter.limit("60/minute")
def get_devices(
    request: Request,
    brand: Optional[str] = None,
    status_filter: Optional[models.DeviceStatus] = None,
    db: Session = Depends(get_db),
) -> List[models.Device]:
    """Retrieve all devices for public catalog (excluding archived devices)."""
    # Booking Pending yang jadwalnya sudah lewat tidak lagi memblokir unit
    _release_stale_booked(db)

    query = db.query(models.Device).filter(models.Device.status != models.DeviceStatus.ARCHIVED)
    if brand and brand != "All":
        query = query.filter(models.Device.brand == brand)
    if status_filter:
        query = query.filter(models.Device.status == status_filter)
    devices = query.all()
    for device in devices:
        device.booked_until = _booked_until(device)
    return devices


@app.post("/api/transactions", response_model=schemas.TransactionOut, tags=["Transactions"])
@limiter.limit("10/minute")
def create_booking_transaction(
    request: Request,
    payload: schemas.TransactionCreate,
    db: Session = Depends(get_db),
) -> models.Transaction:
    """Public customer booking endpoint with anti-spam rate limiting (10 bookings/min per IP)."""
    # Booking Pending yang sudah lewat tidak lagi memblokir — lepas status Booked basi dulu
    _release_stale_booked(db)

    device = db.query(models.Device).filter(models.Device.id == payload.device_id).first()
    if not device or device.status == models.DeviceStatus.ARCHIVED:
        raise HTTPException(status_code=404, detail="Device tidak ditemukan atau sudah tidak tersedia.")

    if device.status != models.DeviceStatus.AVAILABLE:
        raise HTTPException(
            status_code=400,
            detail=f"Unit ini saat ini berstatus '{device.status.value}' dan belum siap disewa.",
        )

    # Upsert customer by NIK — sinkronkan nama & WA dengan input terbaru
    customer = db.query(models.Customer).filter(models.Customer.nik == payload.customer_nik).first()
    if not customer:
        customer = models.Customer(
            name=payload.customer_name,
            nik=payload.customer_nik,
            phone_whatsapp=payload.customer_phone,
        )
        db.add(customer)
        db.flush()
    else:
        customer.name = payload.customer_name
        customer.phone_whatsapp = payload.customer_phone

    duration_hours = getattr(payload, "duration_hours", 24)

    if duration_hours == 3:
        rent_price = device.price_3h
    elif duration_hours == 6:
        rent_price = device.price_6h
    elif duration_hours == 9:
        rent_price = device.price_9h
    elif duration_hours == 12:
        rent_price = device.price_12h
    else:
        rent_price = device.price_24h if device.price_24h and device.price_24h > 0 else device.daily_rent_price

    if not rent_price or rent_price <= 0:
        raise HTTPException(status_code=400, detail="Harga sewa untuk durasi ini belum diatur.")

    total_amount = float(rent_price)

    # Waktu selesai dihitung otomatis: jam mulai + durasi (jam), disimpan lengkap dengan jamnya
    end_date = payload.start_date + timedelta(hours=duration_hours)

    # Create Transaction with financial snapshot
    new_tx = models.Transaction(
        device_id=device.id,
        customer_id=customer.id,
        start_date=payload.start_date,
        end_date_expected=end_date,
        snapshot_rent_price=device.daily_rent_price,
        total_amount=total_amount,
        penalty_fee=0.0,
        status=models.TransactionStatus.PENDING,
    )
    db.add(new_tx)

    # Mark device as Booked
    device.status = models.DeviceStatus.BOOKED

    db.commit()
    db.refresh(new_tx)
    return new_tx


# ==========================================================
# PROTECTED ENDPOINTS (Admin Only - Requires JWT Bearer Token)
# ==========================================================

@app.post("/api/devices", response_model=schemas.DeviceOut, tags=["Admin - Devices"])
def add_new_device(
    payload: schemas.DeviceCreate,
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
) -> models.Device:
    """Protected: Add new device unit to inventory."""
    existing_imei = None
    if payload.imei_serial:  # IMEI opsional — cek duplikat hanya jika diisi
        existing_imei = db.query(models.Device).filter(models.Device.imei_serial == payload.imei_serial).first()
    if existing_imei:
        raise HTTPException(status_code=400, detail="IMEI / Serial sudah terdaftar sebelumnya.")

    new_device = models.Device(**payload.model_dump())
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    return new_device


@app.put("/api/devices/{device_id}", response_model=schemas.DeviceOut, tags=["Admin - Devices"])
def update_device(
    device_id: int,
    payload: schemas.DeviceUpdate,
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
) -> models.Device:
    """Protected: Update an existing device record."""
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device tidak ditemukan.")

    update_data = payload.model_dump(exclude_none=True)
    if "imei_serial" in update_data and update_data["imei_serial"]:
        duplicate = db.query(models.Device).filter(models.Device.imei_serial == update_data["imei_serial"], models.Device.id != device_id).first()
        if duplicate:
            raise HTTPException(status_code=400, detail="IMEI / Serial sudah terdaftar sebelumnya.")

    for field, value in update_data.items():
        setattr(device, field, value)

    db.commit()
    db.refresh(device)
    return device


MIME_BY_EXT: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


def _upload_image_to_supabase_storage(content: bytes, safe_name: str) -> Optional[str]:
    """Upload satu gambar ke bucket Supabase Storage 'devices'.
    Return URL publik absolut, atau None bila SUPABASE_URL/SUPABASE_SERVICE_KEY belum dikonfigurasi."""
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    if not supabase_url or not service_key:
        return None

    base = supabase_url.rstrip("/")
    mime = MIME_BY_EXT.get(os.path.splitext(safe_name)[1].lower(), "image/jpeg")
    response = requests.post(
        f"{base}/storage/v1/object/devices/{safe_name}",
        headers={
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "x-upsert": "true",
            "Content-Type": mime,
        },
        data=content,
        timeout=30,
    )
    response.raise_for_status()
    return f"{base}/storage/v1/object/public/devices/{safe_name}"


@app.post("/api/devices/upload-image", tags=["Admin - Devices"])
def upload_device_image(
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    file: UploadFile = File(...),
):
    """Protected: Upload device image — utama ke Supabase Storage (URL absolut), fallback lokal."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="File gambar wajib dipilih.")

    file_ext = os.path.splitext(file.filename)[1].lower() or ".png"
    safe_name = f"device_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}{file_ext}"
    content = file.file.read()

    # Utama: Supabase Storage -> URL absolut, tampil di lokal maupun Vercel tanpa
    # tergantung folder uploads/ di mesin backend (Railway fs bersifat ephemeral).
    try:
        public_url = _upload_image_to_supabase_storage(content, safe_name)
    except Exception as e:
        print(f"Supabase Storage upload error: {e}")
        public_url = None
    if public_url:
        return {"url": public_url}

    # Fallback lokal (dev tanpa SUPABASE_URL / SUPABASE_SERVICE_KEY)
    file_path = os.path.join("uploads", "devices", safe_name)
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    base_url = os.getenv("PUBLIC_BASE_URL")
    path = f"/uploads/devices/{safe_name}"
    return {"url": f"{base_url.rstrip('/')}{path}" if base_url else path}


@app.put("/api/devices/{device_id}/archive", tags=["Admin - Devices"])
def archive_device(
    device_id: int,
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Protected: Soft-delete/Archive device without removing historical analytics data."""
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device tidak ditemukan.")
    device.status = models.DeviceStatus.ARCHIVED
    db.commit()
    return {"message": f"Unit {device.brand} {device.model} berhasil diarsipkan (soft delete).", "device_id": device_id}


@app.get("/api/transactions", tags=["Admin - Transactions"])
def get_admin_transactions(
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """Protected: Retrieve all transactions with customer & device relations and optional date filtering."""
    query = db.query(models.Transaction)
    if status_filter and status_filter != "All":
        query = query.filter(models.Transaction.status == status_filter)
    if start_date:
        start_dt = datetime.fromisoformat(start_date)
        query = query.filter(models.Transaction.created_at >= start_dt)
    if end_date:
        end_dt = datetime.fromisoformat(end_date)
        end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        query = query.filter(models.Transaction.created_at <= end_dt)

    txs = query.order_by(models.Transaction.created_at.desc()).all()

    # Format enriched response for dashboard
    results = []
    for t in txs:
            days = max(1, (t.end_date_expected - t.start_date).days) if t.end_date_expected and t.start_date else 1
            hours = max(1, round((t.end_date_expected - t.start_date).total_seconds() / 3600)) if t.end_date_expected and t.start_date else 1
            results.append({
                "id": t.id,
                "device_id": t.device_id,
                "device_brand": t.device.brand if t.device else "",
                "device_model": t.device.model if t.device else "",
                "device_imei": t.device.imei_serial if t.device else "",
                "customer_id": t.customer_id,
                "customer_name": t.customer.name if t.customer else "",
                "customer_nik": t.customer.nik if t.customer else "",
                "customer_phone": t.customer.phone_whatsapp if t.customer else "",
                "guarantee_type": "",
                "start_date": t.start_date.isoformat(),
                "end_date_expected": t.end_date_expected.isoformat(),
                "end_date_actual": t.end_date_actual.isoformat() if t.end_date_actual else None,
                "snapshot_rent_price": t.snapshot_rent_price,
                "duration_days": days,
                "duration_hours": hours,
                "total_amount": t.total_amount,
                "penalty_fee": t.penalty_fee,
                "status": t.status.value,
                "created_at": t.created_at.isoformat(),
                "updated_at": t.updated_at.isoformat(),
            })
    return results


@app.put("/api/transactions/{transaction_id}/status", tags=["Admin - Transactions"])
def update_transaction_status(
    transaction_id: int,
    payload: schemas.TransactionStatusUpdate,
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Protected: Update transaction status (Pending -> Active -> Completed/Overdue/Canceled) and sync device status."""
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan.")

    tx.status = payload.status
    if payload.penalty_fee is not None:
        tx.penalty_fee = payload.penalty_fee

    # Sync Device Status
    device = tx.device
    if device:
        if payload.status == models.TransactionStatus.ACTIVE:
            device.status = models.DeviceStatus.RENTED
        elif payload.status in [models.TransactionStatus.COMPLETED, models.TransactionStatus.CANCELED]:
            device.status = models.DeviceStatus.AVAILABLE
            if payload.status == models.TransactionStatus.COMPLETED:
                tx.end_date_actual = datetime.now(timezone.utc)
        elif payload.status == models.TransactionStatus.PENDING:
            device.status = models.DeviceStatus.BOOKED

    db.commit()
    return {"message": "Status transaksi dan device berhasil diperbarui.", "new_status": payload.status.value}


@app.get("/api/export/excel", tags=["Admin - Analytics Export"])
def export_raw_analytics(
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """Protected: Generate raw CSV export of all transactions and asset financial data for Looker Studio / Power BI."""
    # Filter tanggal = PERIODE SEWA (overlap), konsisten dengan filter di dashboard
    query = db.query(models.Transaction)
    if start_date:
        range_start = datetime.fromisoformat(start_date)
        query = query.filter(models.Transaction.end_date_expected >= range_start)
    if end_date:
        range_end = datetime.fromisoformat(end_date)
        range_end = range_end.replace(hour=23, minute=59, second=59, microsecond=999999)
        query = query.filter(models.Transaction.start_date <= range_end)
    transactions = query.order_by(models.Transaction.id.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Headers for Analytics Ingestion (Tidy Data)
    writer.writerow([
        "transaction_id",
        "created_at",
        "status",
        "customer_name",
        "customer_nik",
        "customer_phone",
        "device_brand",
        "device_model",
        "device_imei",
        "purchase_price",
        "snapshot_daily_rent_price",
        "start_date",
        "end_date_expected",
        "end_date_actual",
        "duration_days",
        "duration_hours",
        "total_amount",
        "penalty_fee",
    ])

    for t in transactions:
        dev = t.device
        cust = t.customer
        days = max(1, (t.end_date_expected - t.start_date).days) if t.end_date_expected and t.start_date else 1
        hours = max(1, round((t.end_date_expected - t.start_date).total_seconds() / 3600)) if t.end_date_expected and t.start_date else 1
        writer.writerow([
            t.id,
            t.created_at.isoformat() if t.created_at else "",
            t.status.value if t.status else "",
            cust.name if cust else "",
            f"'{cust.nik}" if cust else "",
            f"'{cust.phone_whatsapp}" if cust else "",
            dev.brand if dev else "",
            dev.model if dev else "",
            f"'{dev.imei_serial}" if dev else "",
            dev.purchase_price if dev else 0,
            t.snapshot_rent_price,
            t.start_date.isoformat() if t.start_date else "",
            t.end_date_expected.isoformat() if t.end_date_expected else "",
            t.end_date_actual.isoformat() if t.end_date_actual else "",
            days,
            hours,
            t.total_amount,
            t.penalty_fee,
        ])

    output.seek(0)
    filename = f"rentalyzer_analytics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

@app.get("/api/devices/{device_id}/history", tags=["Admin - Devices"])
def get_device_history(
    device_id: int,
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Protected: Riwayat transaksi lengkap per device beserta summary analytics."""
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device tidak ditemukan.")

    txs = (
        db.query(models.Transaction)
        .filter(models.Transaction.device_id == device_id)
        .order_by(models.Transaction.created_at.desc())
        .all()
    )

    total_revenue = sum(t.total_amount + t.penalty_fee for t in txs)
    completed_txs = [t for t in txs if t.status == models.TransactionStatus.COMPLETED]
    total_days_rented = sum(
        max(1, (t.end_date_expected - t.start_date).days)
        for t in completed_txs
        if t.end_date_expected and t.start_date
    )
    roi_pct = round((total_revenue / device.purchase_price) * 100, 1) if device.purchase_price else 0

    history = []
    for t in txs:
        days = max(1, (t.end_date_expected - t.start_date).days) if t.end_date_expected and t.start_date else 1
        hours = max(1, round((t.end_date_expected - t.start_date).total_seconds() / 3600)) if t.end_date_expected and t.start_date else 1
        history.append({
            "id": t.id,
            "customer_name": t.customer.name if t.customer else "",
            "customer_phone": t.customer.phone_whatsapp if t.customer else "",
            "start_date": t.start_date.isoformat(),
            "end_date_expected": t.end_date_expected.isoformat(),
            "end_date_actual": t.end_date_actual.isoformat() if t.end_date_actual else None,
            "duration_days": days,
            "duration_hours": hours,
            "total_amount": t.total_amount,
            "penalty_fee": t.penalty_fee,
            "status": t.status.value,
            "created_at": t.created_at.isoformat(),
        })

    return {
        "device": {
            "id": device.id,
            "brand": device.brand,
            "model": device.model,
            "imei_serial": device.imei_serial,
            "color": device.color,
            "image": device.image,
            "purchase_price": device.purchase_price,
            "daily_rent_price": device.daily_rent_price,
            "status": device.status.value,
        },
        "summary": {
            "total_transactions": len(txs),
            "completed_transactions": len(completed_txs),
            "total_revenue": total_revenue,
            "total_days_rented": total_days_rented,
            "roi_percent": roi_pct,
        },
        "transactions": history,
    }


@app.post("/api/transactions/{transaction_id}/extend", tags=["Admin - Transactions"])
def extend_transaction(
    transaction_id: int,
    payload: schemas.TransactionExtend,
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Protected: Perpanjang durasi sewa — update end_date_expected dan tambah biaya."""
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan.")
    if tx.status not in [models.TransactionStatus.ACTIVE, models.TransactionStatus.PENDING, models.TransactionStatus.OVERDUE]:
        raise HTTPException(status_code=400, detail=f"Transaksi berstatus '{tx.status.value}' tidak bisa diperpanjang.")

    device = tx.device
    if not device:
        raise HTTPException(status_code=404, detail="Device terkait tidak ditemukan.")

    # Hitung harga tambahan berdasarkan durasi
    if payload.extra_hours == 3:
        extra_price = device.price_3h or 0
    elif payload.extra_hours == 6:
        extra_price = device.price_6h or 0
    elif payload.extra_hours == 9:
        extra_price = device.price_9h or 0
    elif payload.extra_hours == 12:
        extra_price = device.price_12h or 0
    elif payload.extra_hours == 24:
        extra_price = device.price_24h or device.daily_rent_price
    else:
        # Custom hours — hitung proporsional dari harga harian
        extra_price = round((device.daily_rent_price / 24) * payload.extra_hours)

    tx.end_date_expected = tx.end_date_expected + timedelta(hours=payload.extra_hours)
    tx.total_amount = tx.total_amount + extra_price

    # Kalau overdue, kembalikan ke active
    if tx.status == models.TransactionStatus.OVERDUE:
        tx.status = models.TransactionStatus.ACTIVE
        if device.status == models.DeviceStatus.AVAILABLE:
            device.status = models.DeviceStatus.RENTED

    db.commit()
    db.refresh(tx)
    return {
        "message": f"Sewa berhasil diperpanjang {payload.extra_hours} jam.",
        "extra_hours": payload.extra_hours,
        "extra_charge": extra_price,
        "new_end_date": tx.end_date_expected.isoformat(),
        "new_total_amount": tx.total_amount,
    }


def _fallback_ai_summary(payload: dict) -> str:
    """Simple deterministic business summary when AI is unavailable or disabled."""
    overview = payload.get("overview", {})
    top_devices = payload.get("top_devices", [])
    revenue_chart = payload.get("revenue_chart", [])
    total_revenue = overview.get("total_revenue", 0)
    overdue_count = overview.get("overdue_count", 0)
    pending_count = overview.get("pending_bookings", 0)
    active_rentals = overview.get("active_rentals", 0)

    parts = []
    if total_revenue > 0:
        parts.append(f"Revenue total saat ini mencapai Rp {total_revenue:,.0f}.")
    if overdue_count > 0:
        parts.append(f"Ada {overdue_count} transaksi overdue yang perlu segera ditindaklanjuti.")
    elif pending_count > 0:
        parts.append(f"Ada {pending_count} transaksi pending yang masih menunggu konfirmasi.")
    if active_rentals > 0:
        parts.append(f"Saat ini ada {active_rentals} unit yang sedang disewa aktif.")
    if top_devices:
        top = top_devices[0]
        parts.append(f"Unit paling laris saat ini adalah {top.get('label', 'unit tertentu')} dengan pendapatan Rp {top.get('total_revenue', 0):,.0f}.")
    elif revenue_chart:
        latest = revenue_chart[-1]
        parts.append(f"Perkembangan revenue paling akhir mencatat Rp {latest.get('revenue', 0):,.0f}.")
    if not parts:
        return "Belum ada data transaksi yang cukup untuk menghasilkan insight bisnis yang berarti."
    return " ".join(parts[:4])


def _generate_ai_business_summary(payload: dict) -> tuple[str, str]:
    """Generate admin-facing summary via OpenRouter Chat Completions API (multi-model fallback)."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return _fallback_ai_summary(payload), "fallback"

    system_prompt = (
        "Kamu adalah business analyst untuk usaha rental smartphone. "
        "Berikan ringkasan singkat dalam Bahasa Indonesia yang profesional untuk admin. "
        "Fokus pada revenue, unit paling laris, masalah seperti overdue atau pending, dan satu rekomendasi aksi. "
        "Jawab maksimal 4 kalimat, rapi, dan bersifat bisnis/operasional."
    )

    raw_models = os.getenv("OPENROUTER_MODELS") or os.getenv("OPENROUTER_MODEL", "openrouter/auto")
    models_list = [m.strip() for m in raw_models.split(",") if m.strip()]
    if not models_list:
        models_list = ["openrouter/auto"]
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    site_url = os.getenv("OPENROUTER_SITE_URL")
    site_name = os.getenv("OPENROUTER_SITE_NAME", "Rentalyzer")
    if site_url:
        headers["HTTP-Referer"] = site_url
    if site_name:
        headers["X-Title"] = site_name

    last_error: Exception | None = None
    for model in models_list:
        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
            "temperature": 0.4,
            "max_tokens": 512,
        }
        try:
            response = None
            for attempt in range(2):
                response = requests.post(url, headers=headers, json=body, timeout=60)
                if response.status_code in (429, 500, 502, 503, 504) and attempt < 1:
                    print(f"OpenRouter {model} {response.status_code}, coba ulang {attempt + 1}/1 ...")
                    time.sleep(2 * (attempt + 1))
                    continue
                break
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            if content:
                print(f"[AI Summary] OK via OpenRouter ({model})")
                return content.strip(), "openrouter"
        except Exception as e:
            last_error = e
            print(f"OpenRouter Error ({model}): {e} — switch ke model berikutnya...")
            continue

    if last_error:
        print(f"OpenRouter semua model gagal: {last_error}")

    return _fallback_ai_summary(payload), "fallback"


@app.get("/api/analytics/summary", tags=["Admin - Analytics Export"])
def get_analytics_summary(
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Protected: Data ringkasan analytics untuk dashboard — revenue, utilization, top devices."""
    from collections import defaultdict

    all_txs = db.query(models.Transaction).all()
    all_devices = db.query(models.Device).filter(
        models.Device.status != models.DeviceStatus.ARCHIVED
    ).all()

    now = datetime.now(timezone.utc)

    # Revenue per bulan (12 bulan terakhir)
    monthly_revenue: dict = defaultdict(float)
    for t in all_txs:
        if t.status in [models.TransactionStatus.COMPLETED, models.TransactionStatus.ACTIVE, models.TransactionStatus.OVERDUE]:
            key = t.created_at.strftime("%Y-%m") if t.created_at else None
            if key:
                monthly_revenue[key] += t.total_amount + t.penalty_fee

    # Sort dan ambil 12 bulan terakhir
    sorted_months = sorted(monthly_revenue.keys())[-12:]
    revenue_chart = [{"month": m, "revenue": round(monthly_revenue[m])} for m in sorted_months]

    # Revenue & stats per device
    device_stats = []
    for d in all_devices:
        d_txs = [t for t in all_txs if t.device_id == d.id]
        completed = [t for t in d_txs if t.status == models.TransactionStatus.COMPLETED]
        revenue = sum(t.total_amount + t.penalty_fee for t in d_txs
                      if t.status in [models.TransactionStatus.COMPLETED,
                                       models.TransactionStatus.ACTIVE,
                                       models.TransactionStatus.OVERDUE])
        days_rented = sum(
            max(1, (t.end_date_expected - t.start_date).days)
            for t in completed
            if t.end_date_expected and t.start_date
        )
        roi_pct = round((revenue / d.purchase_price) * 100, 1) if d.purchase_price else 0
        device_stats.append({
            "id": d.id,
            "label": f"{d.brand} {d.model}",
            "brand": d.brand,
            "model": d.model,
            "color": d.color,
            "status": d.status.value,
            "purchase_price": d.purchase_price,
            "daily_rent_price": d.daily_rent_price,
            "total_transactions": len(d_txs),
            "completed_transactions": len(completed),
            "total_revenue": round(revenue),
            "days_rented": days_rented,
            "roi_percent": roi_pct,
        })

    # Sort top devices by revenue
    top_devices = sorted(device_stats, key=lambda x: x["total_revenue"], reverse=True)[:5]

    # Overall stats
    total_revenue = sum(d["total_revenue"] for d in device_stats)
    total_completed = sum(len([t for t in all_txs
                               if t.device_id == d.id and t.status == models.TransactionStatus.COMPLETED])
                          for d in all_devices)
    overdue_count = len([t for t in all_txs if t.status == models.TransactionStatus.OVERDUE])
    pending_count = len([t for t in all_txs if t.status == models.TransactionStatus.PENDING])
    active_count = len([t for t in all_txs if t.status == models.TransactionStatus.ACTIVE])

    return {
        "overview": {
            "total_revenue": round(total_revenue),
            "total_transactions": len(all_txs),
            "completed_transactions": total_completed,
            "active_rentals": active_count,
            "pending_bookings": pending_count,
            "overdue_count": overdue_count,
            "total_devices": len(all_devices),
        },
        "revenue_chart": revenue_chart,
        "device_stats": device_stats,
        "top_devices": top_devices,
    }


@app.get("/api/analytics/summary/ai", tags=["Admin - Analytics Export"])
def get_ai_analytics_summary(
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Protected: Generate concise AI-style business summary from analytics data."""
    payload = get_analytics_summary(_current_admin, db)
    summary, source = _generate_ai_business_summary(payload)
    generated_at = datetime.now(timezone.utc).isoformat()
    return {
        "summary": summary,
        "source": source,
        "source_label": "OpenRouter AI" if source == "openrouter" else "Fallback",
        "generated_at": generated_at,
    }


@app.get("/api/admin/wa-notify/{transaction_id}", tags=["Admin - Transactions"])
def get_wa_notify_link(
    transaction_id: int,
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Protected: Generate link WA untuk notifikasi admin tentang booking baru."""
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan.")

    customer = tx.customer
    device = tx.device
    admin_wa = os.getenv("ADMIN_WHATSAPP", "")

    if not admin_wa:
        raise HTTPException(status_code=400, detail="ADMIN_WHATSAPP belum diset di .env")

    msg = (
        f"*[BOOKING BARU]* #{tx.id}\n"
        f"Penyewa: {customer.name if customer else '-'}\n"
        f"NIK: {customer.nik if customer else '-'}\n"
        f"WA: {customer.phone_whatsapp if customer else '-'}\n"
        f"Unit: {device.brand} {device.model} ({device.color})\n"
        f"Mulai: {tx.start_date.strftime('%d/%m/%Y %H:%M') if tx.start_date else '-'}\n"
        f"Selesai: {tx.end_date_expected.strftime('%d/%m/%Y %H:%M') if tx.end_date_expected else '-'}\n"
        f"Total: Rp {tx.total_amount:,.0f}"
    )

    import urllib.parse
    wa_link = f"https://wa.me/{admin_wa}?text={urllib.parse.quote(msg)}"
    return {"wa_link": wa_link, "message": msg}


@app.get("/api/admin/devices", tags=["Admin - Devices"])
def get_all_devices_admin(
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Protected: Menarik seluruh data HP, termasuk yang Archived."""
    _release_stale_booked(db)
    return db.query(models.Device).order_by(models.Device.id.desc()).all()

@app.delete("/api/devices/{device_id}", tags=["Admin - Devices"])
def delete_device(
    device_id: int,
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Protected: Smart delete — hard delete jika belum ada transaksi, auto-archive jika sudah."""
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device tidak ditemukan.")

    has_transactions = db.query(models.Transaction).filter(
        models.Transaction.device_id == device_id
    ).first() is not None

    if has_transactions:
        # Ada riwayat transaksi — arsipkan saja agar data historis tetap terjaga
        device.status = models.DeviceStatus.ARCHIVED
        db.commit()
        return {
            "action": "archived",
            "message": f"Unit {device.brand} {device.model} memiliki riwayat transaksi dan telah diarsipkan (data historis dijaga).",
            "device_id": device_id,
        }
    else:
        # Belum ada transaksi — aman untuk hard delete
        db.delete(device)
        db.commit()
        return {
            "action": "deleted",
            "message": f"Unit {device.brand} {device.model} berhasil dihapus permanen.",
            "device_id": device_id,
        }


@app.put("/api/devices/{device_id}/restore", tags=["Admin - Devices"])
def restore_device(
    device_id: int,
    _current_admin: Annotated[models.Admin, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Protected: Memulihkan device yang diarsipkan kembali menjadi Available."""
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device tidak ditemukan.")
    
    device.status = models.DeviceStatus.AVAILABLE
    db.commit()
    return {"message": f"Unit {device.brand} {device.model} berhasil dipulihkan.", "device_id": device_id}