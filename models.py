from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional, List
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class DeviceStatus(str, PyEnum):
    AVAILABLE = "Available"
    BOOKED = "Booked"
    RENTED = "Rented"
    MAINTENANCE = "Maintenance"
    ARCHIVED = "Archived"

class TransactionStatus(str, PyEnum):
    PENDING = "Pending"
    ACTIVE = "Active"
    COMPLETED = "Completed"
    OVERDUE = "Overdue"
    CANCELED = "Canceled"

class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    brand: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    imei_serial: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    purchase_price: Mapped[float] = mapped_column(Float, nullable=False)
    daily_rent_price: Mapped[float] = mapped_column(Float, nullable=False)
    color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="Hitam")
    image: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Kolom Harga Per Jam
    price_3h: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    price_6h: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    price_12h: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    price_24h: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)

    status: Mapped[DeviceStatus] = mapped_column(
        Enum(DeviceStatus),
        default=DeviceStatus.AVAILABLE,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction",
        back_populates="device",
        cascade="all, delete-orphan",
    )

class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    nik: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    phone_whatsapp: Mapped[str] = mapped_column(String(25), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction",
        back_populates="customer",
        cascade="all, delete-orphan",
    )

class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), nullable=False)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date_expected: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date_actual: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    snapshot_rent_price: Mapped[float] = mapped_column(Float, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    penalty_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus),
        default=TransactionStatus.PENDING,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    device: Mapped["Device"] = relationship("Device", back_populates="transactions")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="transactions")

class Admin(Base):
    __tablename__ = "admins"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )