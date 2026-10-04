import html
import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from models import DeviceStatus, TransactionStatus


# --- Device Schemas ---
class DeviceBase(BaseModel):
    brand: str = Field(..., min_length=2, max_length=50)
    model: str = Field(..., min_length=2, max_length=100)
    imei_serial: str = Field(..., min_length=8, max_length=100)
    purchase_price: float = Field(..., gt=0, description="Harga modal beli harus lebih besar dari 0")
    daily_rent_price: float = Field(..., gt=0, description="Harga sewa per hari harus lebih besar dari 0")
    color: Optional[str] = Field(default="Hitam", max_length=50)
    image: Optional[str] = Field(default=None, max_length=500)
    price_3h: Optional[float] = Field(default=0.0, ge=0)
    price_6h: Optional[float] = Field(default=0.0, ge=0)
    price_9h: Optional[float] = Field(default=0.0, ge=0)
    price_12h: Optional[float] = Field(default=0.0, ge=0)
    price_24h: Optional[float] = Field(default=0.0, ge=0)
    status: DeviceStatus = DeviceStatus.AVAILABLE

    @field_validator("brand", "model", "imei_serial")
    @classmethod
    def sanitize_strings(cls, v: str) -> str:
        # Prevent HTML/XSS injection
        return html.escape(v.strip())


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    brand: Optional[str] = Field(default=None, min_length=2, max_length=50)
    model: Optional[str] = Field(default=None, min_length=2, max_length=100)
    imei_serial: Optional[str] = Field(default=None, min_length=8, max_length=100)
    purchase_price: Optional[float] = Field(default=None, gt=0)
    daily_rent_price: Optional[float] = Field(default=None, gt=0)
    color: Optional[str] = Field(default=None, max_length=50)
    image: Optional[str] = Field(default=None, max_length=500)
    price_3h: Optional[float] = Field(default=None, ge=0)
    price_6h: Optional[float] = Field(default=None, ge=0)
    price_9h: Optional[float] = Field(default=None, ge=0)
    price_12h: Optional[float] = Field(default=None, ge=0)
    price_24h: Optional[float] = Field(default=None, ge=0)
    status: Optional[DeviceStatus] = None

    @field_validator("brand", "model", "imei_serial")
    @classmethod
    def sanitize_strings(cls, v: str) -> str:
        if v is None:
            return v
        return html.escape(v.strip())


class DeviceOut(DeviceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Customer Schemas ---
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    nik: str = Field(..., min_length=16, max_length=16, description="NIK harus 16 digit angka")
    phone_whatsapp: str = Field(..., min_length=10, max_length=20)

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        clean = html.escape(v.strip())
        if len(clean) < 2:
            raise ValueError("Nama terlalu pendek.")
        return clean

    @field_validator("nik")
    @classmethod
    def validate_nik(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^\d{16}$", clean):
            raise ValueError("NIK harus berupa 16 digit angka valid.")
        return clean

    @field_validator("phone_whatsapp")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = re.sub(r"[\s\-]", "", v.strip())
        if not re.match(r"^(\+62|62|0)8[0-9]{7,12}$", clean):
            raise ValueError("Nomor WhatsApp tidak valid (format: 08xx / 628xx).")
        return clean


class CustomerCreate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Transaction Schemas ---
class TransactionCreate(BaseModel):
    device_id: int = Field(..., gt=0)
    customer_name: str = Field(..., min_length=2, max_length=100)
    customer_nik: str = Field(..., min_length=16, max_length=16)
    customer_phone: str = Field(..., min_length=10, max_length=20)
    guarantee_type: str = Field(..., min_length=3, max_length=50)
    start_date: datetime
    end_date_expected: datetime
    duration_hours: Optional[int] = Field(default=24, ge=1, le=24)
    # Optional: sent by frontend, backend recalculates server-side
    snapshot_rent_price: Optional[float] = None
    duration_days: Optional[int] = None
    total_amount: Optional[float] = None

    @field_validator("customer_name")
    @classmethod
    def sanitize_customer_name(cls, v: str) -> str:
        return html.escape(v.strip())

    @field_validator("customer_nik")
    @classmethod
    def validate_customer_nik(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^\d{16}$", clean):
            raise ValueError("NIK harus 16 digit angka.")
        return clean

    @field_validator("customer_phone")
    @classmethod
    def validate_customer_phone(cls, v: str) -> str:
        clean = re.sub(r"[\s\-]", "", v.strip())
        if not re.match(r"^(\+62|62|0)8[0-9]{7,12}$", clean):
            raise ValueError("Nomor WhatsApp tidak valid.")
        return clean

    @field_validator("end_date_expected")
    @classmethod
    def validate_dates(cls, v: datetime, info) -> datetime:
        start_date = info.data.get("start_date")
        if start_date and v <= start_date:
            raise ValueError("Tanggal selesai sewa harus lebih besar dari tanggal mulai.")
        return v


class TransactionStatusUpdate(BaseModel):
    status: TransactionStatus
    penalty_fee: Optional[float] = Field(default=0.0, ge=0)


class TransactionOut(BaseModel):
    id: int
    device_id: int
    customer_id: int
    start_date: datetime
    end_date_expected: datetime
    end_date_actual: Optional[datetime]
    snapshot_rent_price: float
    total_amount: float
    penalty_fee: float
    status: TransactionStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
