r"""Migrasi gambar unit dari folder uploads/ lokal ke Supabase Storage (bucket 'devices').

Jalankan sekali: python migrate_uploads_to_storage.py
Membuat bucket bila belum ada, mengunggah ulang file, lalu memperbarui kolom devices.image
menjadi URL publik absolut Supabase Storage.
"""
import os

import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
BUCKET: str = "devices"
ALLOWED_MIME: list[str] = ["image/png", "image/jpeg", "image/webp", "image/gif"]
MIME_BY_EXT: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {SERVICE_KEY}", "apikey": SERVICE_KEY}


def ensure_bucket() -> None:
    """Buat bucket publik 'devices' bila belum ada."""
    check = requests.get(f"{SUPABASE_URL}/storage/v1/bucket/{BUCKET}", headers=_headers(), timeout=30)
    if check.status_code == 200:
        print(f"Bucket '{BUCKET}' sudah ada.")
        return
    create = requests.post(
        f"{SUPABASE_URL}/storage/v1/bucket",
        json={
            "id": BUCKET,
            "name": BUCKET,
            "public": True,
            "file_size_limit": 5242880,  # 5 MB
            "allowed_mime_types": ALLOWED_MIME,
        },
        headers=_headers(),
        timeout=30,
    )
    create.raise_for_status()
    print(f"Bucket '{BUCKET}' dibuat (public).")


def migrate() -> None:
    engine = create_engine(os.environ["DATABASE_URL"])
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, brand, model, image FROM devices WHERE image LIKE '/uploads/%' ORDER BY id")
        ).fetchall()
        if not rows:
            print("Tidak ada gambar path-relatif yang perlu dimigrasi. Selesai.")
            return

        for device_id, brand, model, image_path in rows:
            local_path = os.path.join(".", image_path.lstrip("/").replace("/", os.sep))
            if not os.path.exists(local_path):
                print(f"SKIP id={device_id}: file lokal tidak ditemukan ({image_path})")
                continue

            filename = os.path.basename(image_path)
            mime = MIME_BY_EXT.get(os.path.splitext(filename)[1].lower(), "image/jpeg")
            with open(local_path, "rb") as fh:
                resp = requests.post(
                    f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{filename}",
                    headers={**_headers(), "x-upsert": "true", "Content-Type": mime},
                    data=fh.read(),
                    timeout=60,
                )
            if resp.status_code not in (200, 201):
                print(f"GAGAL id={device_id}: HTTP {resp.status_code} {resp.text[:200]}")
                continue

            url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{filename}"
            conn.execute(
                text("UPDATE devices SET image = :url WHERE id = :id"),
                {"url": url, "id": device_id},
            )
            print(f"OK id={device_id} {brand} {model} -> {url}")

        conn.commit()
        print("Selesai.")


def main() -> None:
    if not SUPABASE_URL or not SERVICE_KEY:
        raise SystemExit("SUPABASE_URL / SUPABASE_SERVICE_KEY belum diisi di .env")
    ensure_bucket()
    migrate()


if __name__ == "__main__":
    main()
