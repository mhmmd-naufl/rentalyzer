"""
Full Feature Test Suite - Rentalyzer / Notta Rent
Menggunakan FastAPI TestClient (tidak perlu server aktif).
Jalankan: python test_all_features.py
"""
import os
# Gunakan SQLite lokal untuk testing - tidak perlu koneksi Supabase
os.environ["DATABASE_URL"] = "sqlite:///./test_runner.db"

from fastapi.testclient import TestClient
import main
import models
import database
from auth import create_access_token, get_password_hash

# Seed admin ke test DB sebelum client dibuat
database.Base.metadata.create_all(bind=database.engine)
_db = next(database.get_db())
if not _db.query(models.Admin).filter(models.Admin.username == "admin").first():
    _db.add(models.Admin(
        username="admin",
        hashed_password=get_password_hash("admin123"),
        full_name="Test Admin"
    ))
    _db.commit()
_db.close()

client = TestClient(main.app, raise_server_exceptions=False)

# helpers
total_tests = 0
passed_tests = 0
failed_tests = []

def check(name, condition, detail=""):
    global total_tests, passed_tests
    total_tests += 1
    if condition:
        passed_tests += 1
        print(f"  [PASS] {name}" + (f" | {detail}" if detail else ""))
    else:
        failed_tests.append(name)
        print(f"  [FAIL] {name}" + (f" | {detail}" if detail else ""))

def admin_headers():
    token = create_access_token(data={"sub": "admin"})
    return {"Authorization": f"Bearer {token}"}


# 1. HEALTH CHECK
def test_health():
    print("\n[1] Health Check")
    r = client.get("/health")
    check("GET /health returns 200", r.status_code == 200)
    check("Response berisi status ok", r.json().get("status") == "ok")


# 2. PUBLIC CATALOG
def test_public_devices():
    print("\n[2] Public Catalog - GET /api/devices")
    r = client.get("/api/devices")
    check("Status 200", r.status_code == 200)
    data = r.json()
    check("Response berupa list", isinstance(data, list))
    check("Tidak ada device Archived di katalog publik",
          all(d["status"] != "Archived" for d in data),
          f"{len(data)} device")
    r2 = client.get("/api/devices?brand=Apple")
    check("Filter brand=Apple berfungsi",
          r2.status_code == 200 and all(d["brand"] == "Apple" for d in r2.json()))


# 3. AUTH LOGIN
def test_auth():
    print("\n[3] Auth - Login Admin")
    r = client.post("/api/auth/login-json",
                    json={"username": "admin", "password": "admin123"})
    check("Login valid -> 200", r.status_code == 200, f"body={r.text[:80]}")
    check("Response berisi access_token", "access_token" in r.json())
    r2 = client.post("/api/auth/login-json",
                     json={"username": "admin", "password": "salah"})
    check("Login password salah -> 401", r2.status_code == 401)
    r3 = client.post("/api/auth/login-json",
                     json={"username": "hacker", "password": "apapun"})
    check("Login username tidak ada -> 401", r3.status_code == 401)


# 4. SECURITY
def test_security():
    print("\n[4] Security - Unauthorized & JWT")
    check("GET /api/transactions tanpa token -> 401",
          client.get("/api/transactions").status_code == 401)
    check("GET /api/export/excel tanpa token -> 401",
          client.get("/api/export/excel").status_code == 401)
    check("POST /api/devices tanpa token -> 401",
          client.post("/api/devices", json={}).status_code == 401)
    check("PUT /api/devices/1/archive tanpa token -> 401",
          client.put("/api/devices/1/archive").status_code == 401)
    check("DELETE /api/devices/1 tanpa token -> 401",
          client.delete("/api/devices/1").status_code == 401)
    fake = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.tampered"
    check("Token JWT palsu -> 401",
          client.get("/api/transactions",
                     headers={"Authorization": f"Bearer {fake}"}).status_code == 401)
    r = client.get("/api/devices")
    check("X-Frame-Options: DENY", r.headers.get("X-Frame-Options") == "DENY")
    check("X-Content-Type-Options: nosniff",
          r.headers.get("X-Content-Type-Options") == "nosniff")
    check("HSTS header ada",
          "max-age" in r.headers.get("Strict-Transport-Security", ""))


# 5. ADMIN DEVICE MANAGEMENT
def test_admin_devices():
    print("\n[5] Admin - Device Management")
    hdrs = admin_headers()

    r = client.get("/api/admin/devices", headers=hdrs)
    check("GET /api/admin/devices -> 200", r.status_code == 200, f"status={r.status_code}")
    check("Response berupa list", isinstance(r.json(), list))

    new_device = {
        "brand": "Apple", "model": "iPhone TEST UNIT",
        "imei_serial": "TEST_IMEI_99999", "purchase_price": 10000000,
        "daily_rent_price": 150000, "color": "Black",
        "price_3h": 60000, "price_6h": 100000,
        "price_9h": 130000, "price_12h": 160000, "price_24h": 200000,
    }
    r2 = client.post("/api/devices", json=new_device, headers=hdrs)
    check("POST /api/devices (tambah unit) -> 200", r2.status_code == 200,
          f"status={r2.status_code}")
    device_id = r2.json().get("id") if r2.status_code == 200 else None
    check("Response berisi id device baru", device_id is not None)

    r3 = client.post("/api/devices", json=new_device, headers=hdrs)
    check("Duplikat IMEI ditolak -> 400", r3.status_code == 400)

    if device_id:
        r4 = client.put(f"/api/devices/{device_id}",
                        json={"color": "White", "daily_rent_price": 160000},
                        headers=hdrs)
        check("PUT /api/devices/{id} (update) -> 200", r4.status_code == 200)
        check("Warna berhasil diupdate",
              r4.json().get("color") == "White" if r4.status_code == 200 else False)

        r5 = client.put(f"/api/devices/{device_id}/archive", headers=hdrs)
        check("PUT /api/devices/{id}/archive -> 200", r5.status_code == 200)

        r6 = client.put(f"/api/devices/{device_id}/restore", headers=hdrs)
        check("PUT /api/devices/{id}/restore -> 200", r6.status_code == 200)

        r7 = client.delete(f"/api/devices/{device_id}", headers=hdrs)
        check("DELETE /api/devices/{id} -> 200", r7.status_code == 200)
        check("Smart delete action=deleted (belum ada transaksi)",
              r7.json().get("action") == "deleted" if r7.status_code == 200 else False)

        r8 = client.get("/api/admin/devices", headers=hdrs)
        ids = [d["id"] for d in r8.json()]
        check("Device benar-benar terhapus dari DB", device_id not in ids)


# 6. PUBLIC BOOKING
def test_booking():
    print("\n[6] Public - Booking Transaction")
    hdrs = admin_headers()

    r_dev = client.post("/api/devices", json={
        "brand": "Apple", "model": "iPhone Booking Test",
        "imei_serial": "BOOKING_TEST_IMEI", "purchase_price": 10000000,
        "daily_rent_price": 150000, "color": "Black",
        "price_3h": 60000, "price_6h": 100000,
        "price_9h": 130000, "price_12h": 160000, "price_24h": 200000,
    }, headers=hdrs)

    if r_dev.status_code != 200:
        print("  [SKIP] Gagal membuat device test booking.")
        return None, None

    device_id = r_dev.json()["id"]
    payload = {
        "device_id": device_id,
        "customer_name": "Test User Automation",
        "customer_nik": "3201000000000099",
        "customer_phone": "6281234560099",
        "guarantee_type": "KTP",
        "duration_hours": 24,
        "start_date": "2026-12-01T10:00:00",
        "end_date_expected": "2026-12-02T10:00:00",
    }
    r = client.post("/api/transactions", json=payload)
    check("POST /api/transactions (booking valid) -> 200", r.status_code == 200,
          f"status={r.status_code}")
    tx_id = r.json().get("id") if r.status_code == 200 else None
    check("Response berisi transaction id", tx_id is not None)

    devices_after = client.get("/api/devices").json()
    dev_after = next((d for d in devices_after if d["id"] == device_id), None)
    check("Status device berubah Booked setelah booking",
          dev_after is not None and dev_after["status"] == "Booked")

    payload2 = {**payload, "customer_nik": "3201000000000088", "customer_phone": "6281234560088"}
    r2 = client.post("/api/transactions", json=payload2)
    check("Booking device yang sudah Booked ditolak -> 400", r2.status_code == 400)

    payload_bad = {**payload, "customer_nik": "123ABC"}
    r3 = client.post("/api/transactions", json=payload_bad)
    check("NIK tidak valid ditolak -> 422", r3.status_code == 422)

    return tx_id, device_id


# 7. ADMIN TRANSACTION MANAGEMENT
def test_transaction_management(tx_id=None, device_id=None):
    print("\n[7] Admin - Transaction Management")
    hdrs = admin_headers()

    r = client.get("/api/transactions", headers=hdrs)
    check("GET /api/transactions -> 200", r.status_code == 200)
    txs = r.json() if r.status_code == 200 else []
    check("Response berupa list", isinstance(txs, list))

    if not tx_id and isinstance(txs, list) and len(txs) > 0:
        tx_id = txs[0]["id"]
        device_id = txs[0]["device_id"]

    if not tx_id:
        print("  [SKIP] Tidak ada transaksi untuk diuji.")
        return

    r2 = client.put(f"/api/transactions/{tx_id}/status",
                    json={"status": "Active", "penalty_fee": 0}, headers=hdrs)
    check("Update status Pending -> Active -> 200", r2.status_code == 200)

    devs = client.get("/api/admin/devices", headers=hdrs).json()
    dev = next((d for d in devs if d["id"] == device_id), None)
    check("Status device Rented saat Active",
          dev is not None and dev["status"] == "Rented")

    r3 = client.put(f"/api/transactions/{tx_id}/status",
                    json={"status": "Completed", "penalty_fee": 50000}, headers=hdrs)
    check("Update status Active -> Completed -> 200", r3.status_code == 200)

    devs2 = client.get("/api/admin/devices", headers=hdrs).json()
    dev2 = next((d for d in devs2 if d["id"] == device_id), None)
    check("Status device Available setelah Completed",
          dev2 is not None and dev2["status"] == "Available")

    r4 = client.put(f"/api/transactions/{tx_id}/status",
                    json={"status": "INVALID_STATUS"}, headers=hdrs)
    check("Status tidak valid ditolak -> 422", r4.status_code == 422)


# 8. SMART DELETE dengan transaksi
def test_smart_delete_with_transaction():
    print("\n[8] Admin - Smart Delete (device dengan riwayat transaksi)")
    hdrs = admin_headers()

    txs = client.get("/api/transactions", headers=hdrs).json()
    if not isinstance(txs, list) or len(txs) == 0:
        print("  [SKIP] Tidak ada transaksi untuk test smart delete.")
        return

    device_id = txs[0]["device_id"]
    r = client.delete(f"/api/devices/{device_id}", headers=hdrs)
    check("DELETE device dengan transaksi -> 200", r.status_code == 200)
    check("Smart delete action=archived (ada transaksi)",
          r.json().get("action") == "archived" if r.status_code == 200 else False)
    client.put(f"/api/devices/{device_id}/restore", headers=hdrs)


# 9. EXPORT CSV
def test_export_csv():
    print("\n[9] Admin - Export CSV")
    hdrs = admin_headers()

    r = client.get("/api/export/excel", headers=hdrs)
    check("GET /api/export/excel -> 200", r.status_code == 200)
    check("Content-Type adalah text/csv",
          "text/csv" in r.headers.get("content-type", ""))
    check("Response tidak kosong", len(r.content) > 0)

    r2 = client.get("/api/export/excel?start_date=2026-01-01&end_date=2026-12-31",
                    headers=hdrs)
    check("Export dengan filter tanggal -> 200", r2.status_code == 200)


# 10. EXTEND TRANSACTION
def test_extend_transaction():
    print("\n[10] Admin - Extend Transaction (Perpanjang Sewa)")
    hdrs = admin_headers()

    # Buat device + booking untuk test extend
    r_dev = client.post("/api/devices", json={
        "brand": "Apple", "model": "iPhone Extend Test",
        "imei_serial": "EXTEND_TEST_IMEI", "purchase_price": 10000000,
        "daily_rent_price": 200000, "color": "Black",
        "price_3h": 60000, "price_6h": 100000,
        "price_9h": 130000, "price_12h": 160000, "price_24h": 250000,
    }, headers=hdrs)
    if r_dev.status_code != 200:
        print("  [SKIP] Gagal membuat device test extend.")
        return
    device_id = r_dev.json()["id"]

    r_tx = client.post("/api/transactions", json={
        "device_id": device_id,
        "customer_name": "Extend Tester",
        "customer_nik": "3201000000000077",
        "customer_phone": "6281234560077",
        "guarantee_type": "KTP",
        "duration_hours": 24,
        "start_date": "2026-12-10T10:00:00",
        "end_date_expected": "2026-12-11T10:00:00",
    })
    if r_tx.status_code != 200:
        print("  [SKIP] Gagal membuat transaksi test extend.")
        return
    tx_id = r_tx.json()["id"]

    # Extend 24 jam
    r_ext = client.post(f"/api/transactions/{tx_id}/extend",
                        json={"extra_hours": 24}, headers=hdrs)
    check("POST extend 24 jam -> 200", r_ext.status_code == 200,
          f"body={r_ext.text[:100]}")
    if r_ext.status_code == 200:
        body = r_ext.json()
        check("Response berisi extra_charge", body.get("extra_charge", 0) > 0,
              f"charge={body.get('extra_charge')}")
        check("Total amount bertambah", body.get("new_total_amount", 0) > 250000,
              f"total={body.get('new_total_amount')}")

    # Extend jam tidak valid
    r_bad = client.post(f"/api/transactions/{tx_id}/extend",
                        json={"extra_hours": -5}, headers=hdrs)
    check("Extend durasi negatif ditolak -> 422", r_bad.status_code == 422)

    # Cleanup: cancel transaksi + hapus device
    client.put(f"/api/transactions/{tx_id}/status",
               json={"status": "Canceled", "penalty_fee": 0}, headers=hdrs)
    client.delete(f"/api/devices/{device_id}", headers=hdrs)


# 11. DEVICE HISTORY
def test_device_history():
    print("\n[11] Admin - Device History")
    hdrs = admin_headers()

    # Cari device yang punya riwayat transaksi
    txs = client.get("/api/transactions", headers=hdrs).json()
    if not isinstance(txs, list) or len(txs) == 0:
        print("  [SKIP] Tidak ada transaksi untuk test history.")
        return

    device_id = txs[0]["device_id"]
    r = client.get(f"/api/devices/{device_id}/history", headers=hdrs)
    check("GET /api/devices/{id}/history -> 200", r.status_code == 200)
    if r.status_code == 200:
        body = r.json()
        check("Response berisi device info", "device" in body)
        check("Response berisi summary", "summary" in body,
              f"revenue={body['summary']['total_revenue']}")
        check("Response berisi list transactions", isinstance(body.get("transactions"), list))
        check("summary berisi roi_percent", "roi_percent" in body["summary"])

    # History device tidak ada
    r404 = client.get("/api/devices/99999/history", headers=hdrs)
    check("History device tidak ada -> 404", r404.status_code == 404)


# 12. ANALYTICS SUMMARY
def test_analytics_summary():
    print("\n[12] Admin - Analytics Summary")
    hdrs = admin_headers()

    r = client.get("/api/analytics/summary", headers=hdrs)
    check("GET /api/analytics/summary -> 200", r.status_code == 200)
    if r.status_code == 200:
        body = r.json()
        check("Response berisi overview", "overview" in body)
        check("Response berisi revenue_chart (list)",
              isinstance(body.get("revenue_chart"), list))
        check("Response berisi device_stats (list)",
              isinstance(body.get("device_stats"), list))
        check("Response berisi top_devices",
              isinstance(body.get("top_devices"), list))
        check("overview berisi total_revenue", "total_revenue" in body["overview"])

    # Tanpa token -> 401
    check("Tanpa token -> 401",
          client.get("/api/analytics/summary").status_code == 401)


# 13. WA NOTIFY LINK
def test_wa_notify():
    print("\n[13] Admin - WA Notify Link")
    hdrs = admin_headers()

    txs = client.get("/api/transactions", headers=hdrs).json()
    if not isinstance(txs, list) or len(txs) == 0:
        print("  [SKIP] Tidak ada transaksi untuk test WA notify.")
        return

    tx_id = txs[0]["id"]
    r = client.get(f"/api/admin/wa-notify/{tx_id}", headers=hdrs)
    # ADMIN_WHATSAPP belum diisi -> 400, atau sudah ada -> 200
    check("GET /api/admin/wa-notify/{id} responsif",
          r.status_code in (200, 400),
          f"status={r.status_code} (400=ADMIN_WHATSAPP belum di-set)")
    if r.status_code == 200:
        check("Response berisi wa_link", "wa_link" in r.json())

    check("WA notify tanpa token -> 401",
          client.get(f"/api/admin/wa-notify/{tx_id}").status_code == 401)


# MAIN
if __name__ == "__main__":
    print("=" * 60)
    print("  FULL FEATURE TEST SUITE - Notta Rent / Rentalyzer")
    print("=" * 60)

    test_health()
    test_public_devices()
    test_auth()
    test_security()
    test_admin_devices()
    booking_result = test_booking()
    tx_id, device_id = booking_result if booking_result else (None, None)
    test_transaction_management(tx_id, device_id)
    test_smart_delete_with_transaction()
    test_export_csv()
    test_extend_transaction()
    test_device_history()
    test_analytics_summary()
    test_wa_notify()

    # Cleanup — tutup semua koneksi dulu sebelum hapus file
    database.engine.dispose()
    if os.path.exists("test_runner.db"):
        try:
            os.remove("test_runner.db")
        except PermissionError:
            print("  (test_runner.db akan dihapus saat proses selesai)")

    print("\n" + "=" * 60)
    status = "SEMUA LULUS" if not failed_tests else f"{len(failed_tests)} GAGAL"
    print(f"  HASIL: {passed_tests}/{total_tests} test lulus - {status}")
    if failed_tests:
        print("\n  Test yang gagal:")
        for f in failed_tests:
            print(f"    - {f}")
    print("=" * 60)
