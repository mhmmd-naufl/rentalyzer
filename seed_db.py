from datetime import datetime, timezone
import database
import models

def seed_database():
    db = next(database.get_db())
    try:
        # Check if devices already exist
        if db.query(models.Device).count() == 0:
            print("Memasukkan data awal ke tabel devices...")
            sample_devices = [
                models.Device(
                    brand="Apple",
                    model="iPhone 15 Pro Max 256GB",
                    imei_serial="356891234567890",
                    purchase_price=21500000.0,
                    daily_rent_price=350000.0,
                    price_3h=180000.0,
                    price_6h=300000.0,
                    price_9h=420000.0,
                    price_12h=580000.0,
                    price_24h=850000.0,
                    status=models.DeviceStatus.AVAILABLE,
                    created_at=datetime.now(timezone.utc)
                ),
                models.Device(
                    brand="Apple",
                    model="iPhone 13 Pro 128GB",
                    imei_serial="352341234567891",
                    purchase_price=13500000.0,
                    daily_rent_price=200000.0,
                    price_3h=90000.0,
                    price_6h=160000.0,
                    price_9h=240000.0,
                    price_12h=320000.0,
                    price_24h=500000.0,
                    status=models.DeviceStatus.BOOKED,
                    created_at=datetime.now(timezone.utc)
                ),
                models.Device(
                    brand="Samsung",
                    model="Galaxy S23 Ultra 512GB",
                    imei_serial="354561234567892",
                    purchase_price=17500000.0,
                    daily_rent_price=300000.0,
                    price_3h=140000.0,
                    price_6h=250000.0,
                    price_9h=350000.0,
                    price_12h=470000.0,
                    price_24h=700000.0,
                    status=models.DeviceStatus.AVAILABLE,
                    created_at=datetime.now(timezone.utc)
                ),
                models.Device(
                    brand="Samsung",
                    model="Galaxy Z Flip 5 256GB",
                    imei_serial="357891234567893",
                    purchase_price=14000000.0,
                    daily_rent_price=250000.0,
                    price_3h=120000.0,
                    price_6h=210000.0,
                    price_9h=310000.0,
                    price_12h=430000.0,
                    price_24h=600000.0,
                    status=models.DeviceStatus.RENTED,
                    created_at=datetime.now(timezone.utc)
                ),
                models.Device(
                    brand="Apple",
                    model="iPhone 14 128GB",
                    imei_serial="359011234567894",
                    purchase_price=12000000.0,
                    daily_rent_price=180000.0,
                    price_3h=80000.0,
                    price_6h=140000.0,
                    price_9h=210000.0,
                    price_12h=290000.0,
                    price_24h=420000.0,
                    status=models.DeviceStatus.AVAILABLE,
                    created_at=datetime.now(timezone.utc)
                ),
                models.Device(
                    brand="Google",
                    model="Pixel 8 Pro 256GB",
                    imei_serial="351231234567895",
                    purchase_price=15000000.0,
                    daily_rent_price=270000.0,
                    price_3h=120000.0,
                    price_6h=200000.0,
                    price_9h=300000.0,
                    price_12h=410000.0,
                    price_24h=620000.0,
                    status=models.DeviceStatus.MAINTENANCE,
                    created_at=datetime.now(timezone.utc)
                ),
            ]
            db.add_all(sample_devices)
            db.commit()

        # Seed sample Customer and Transaction
        if db.query(models.Customer).count() == 0:
            print("Memasukkan data awal ke tabel customers & transactions...")
            customer1 = models.Customer(
                name="Budi Santoso",
                nik="3201123456780001",
                phone_whatsapp="6281234567890",
                created_at=datetime.now(timezone.utc)
            )
            customer2 = models.Customer(
                name="Siti Rahma",
                nik="3171098765430002",
                phone_whatsapp="6285678901234",
                created_at=datetime.now(timezone.utc)
            )
            db.add_all([customer1, customer2])
            db.flush()

            # Transaction 1
            tx1 = models.Transaction(
                device_id=2, # iPhone 13 Pro
                customer_id=customer1.id,
                start_date=datetime(2026, 10, 5),
                end_date_expected=datetime(2026, 10, 8),
                snapshot_rent_price=200000.0,
                total_amount=600000.0,
                penalty_fee=0.0,
                status=models.TransactionStatus.PENDING,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )

            # Transaction 2
            tx2 = models.Transaction(
                device_id=4, # Galaxy Z Flip 5
                customer_id=customer2.id,
                start_date=datetime(2026, 10, 1),
                end_date_expected=datetime(2026, 10, 5),
                snapshot_rent_price=250000.0,
                total_amount=1000000.0,
                penalty_fee=0.0,
                status=models.TransactionStatus.ACTIVE,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add_all([tx1, tx2])
            db.commit()

        print("Berhasil! Seluruh data awal telah tersimpan di SQLite rentalyzer.db")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
