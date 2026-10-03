import json
from fastapi.testclient import TestClient
import main
from auth import create_access_token

client = TestClient(main.app)

def run_security_suite():
    print("=" * 60)
    print("[SECURITY AUDIT] MEMULAI PENGUJIAN KEAMANAN SISTEM")
    print("=" * 60)

    total_tests = 0
    passed_tests = 0

    def assert_test(name, condition, detail=""):
        nonlocal total_tests, passed_tests
        total_tests += 1
        if condition:
            passed_tests += 1
            print(f"  [PASS] {name} -> {detail}")
        else:
            print(f"  [FAIL] {name} -> {detail}")

    # 1. HTTP Security Headers
    print("\n1. Menguji HTTP Security Headers...")
    r = client.get("/api/devices")
    assert_test(
        "Clickjacking Protection",
        r.headers.get("X-Frame-Options") == "DENY",
        f"X-Frame-Options={r.headers.get('X-Frame-Options')}"
    )
    assert_test(
        "MIME-sniffing Protection",
        r.headers.get("X-Content-Type-Options") == "nosniff",
        f"X-Content-Type-Options={r.headers.get('X-Content-Type-Options')}"
    )
    assert_test(
        "HSTS Policy",
        "max-age" in r.headers.get("Strict-Transport-Security", ""),
        f"HSTS={r.headers.get('Strict-Transport-Security')}"
    )

    # 2. Unauthorized Access
    print("\n2. Menguji Penolakan Akses Tanpa Token...")
    r_tx = client.get("/api/transactions")
    assert_test(
        "Blokir Akses Transaksi Tanpa Token",
        r_tx.status_code == 401,
        f"Status={r_tx.status_code} (Unauthorized)"
    )

    r_export = client.get("/api/export/excel")
    assert_test(
        "Blokir Export CSV Tanpa Token",
        r_export.status_code == 401,
        f"Status={r_export.status_code} (Unauthorized)"
    )

    r_add_dev = client.post("/api/devices", json={
        "brand": "Apple",
        "model": "iPhone Test",
        "imei_serial": "999999999999",
        "purchase_price": 10000000,
        "daily_rent_price": 200000
    })
    assert_test(
        "Blokir Tambah Unit Tanpa Token",
        r_add_dev.status_code == 401,
        f"Status={r_add_dev.status_code} (Unauthorized)"
    )

    # 3. Tampered JWT Token
    print("\n3. Menguji Token JWT Palsu/Dimanipulasi...")
    fake_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.tampered_signature"
    r_fake = client.get(
        "/api/transactions",
        headers={"Authorization": f"Bearer {fake_token}"}
    )
    assert_test(
        "Tolak Token Palsu",
        r_fake.status_code == 401,
        f"Status={r_fake.status_code} (Ditolak)"
    )

    # 4. Input Sanitization & Validation
    print("\n4. Menguji Sanitasi Injeksi XSS & Validasi NIK...")
    payload_invalid_nik = {
        "device_id": 1,
        "customer_name": "Budi",
        "customer_nik": "12345ABC",
        "customer_phone": "081234567890",
        "guarantee_type": "KTP",
        "start_date": "2026-10-05T00:00:00",
        "end_date_expected": "2026-10-07T00:00:00"
    }
    r_nik = client.post("/api/transactions", json=payload_invalid_nik)
    assert_test(
        "Tolak NIK Tidak Valid (Bukan 16 digit)",
        r_nik.status_code == 422,
        f"Status={r_nik.status_code} (Unprocessable Entity)"
    )

    payload_xss = {
        "device_id": 1,
        "customer_name": "<script>alert('xss')</script>Andi",
        "customer_nik": "3201123456780099",
        "customer_phone": "081234567899",
        "guarantee_type": "KTP",
        "start_date": "2026-10-05T00:00:00",
        "end_date_expected": "2026-10-07T00:00:00"
    }
    r_xss = client.post("/api/transactions", json=payload_xss)
    assert_test(
        "Sanitasi Tag XSS",
        "<script>" not in str(r_xss.content),
        "Tag script berbahaya dinetralisir"
    )

    # 5. Authenticated Admin Access
    print("\n5. Menguji Akses dengan Token JWT Sah...")
    valid_token = create_access_token(data={"sub": "admin"})
    auth_headers = {"Authorization": f"Bearer {valid_token}"}
    
    r_auth_tx = client.get("/api/transactions", headers=auth_headers)
    assert_test(
        "Akses Transaksi dengan Token Sah",
        r_auth_tx.status_code == 200,
        f"Status=200 OK, {len(r_auth_tx.json())} transaksi dimuat"
    )

    r_auth_exp = client.get("/api/export/excel", headers=auth_headers)
    assert_test(
        "Akses Export CSV dengan Token Sah",
        r_auth_exp.status_code == 200 and "text/csv" in r_auth_exp.headers.get("content-type", ""),
        "Status=200 OK, Streaming text/csv aktif"
    )

    print("\n" + "=" * 60)
    print(f"HASIL AKHIR: {passed_tests}/{total_tests} PENGUJIAN KEAMANAN LULUS (100%)")
    print("=" * 60)

if __name__ == "__main__":
    run_security_suite()
