from schemas import DeviceCreate


def test_device_create_accepts_hourly_rental_fields():
    device = DeviceCreate(
        brand='Apple',
        model='iPhone 15',
        imei_serial='356789012345678',
        purchase_price=15000000,
        daily_rent_price=300000,
        price_3h=150000,
        price_6h=250000,
        price_9h=350000,
        price_12h=450000,
        price_24h=600000,
    )

    data = device.model_dump()
    assert data['price_3h'] == 150000
    assert data['price_6h'] == 250000
    assert data['price_9h'] == 350000
    assert data['price_12h'] == 450000
    assert data['price_24h'] == 600000
