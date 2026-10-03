# schema.md (Database Architecture)

Arsitektur database ini dirancang relasional untuk mempermudah ekstraksi *time-series* dan data finansial.

## 1. Table: devices (Dimensi Aset)
Menyimpan entitas barang yang disewakan.
*   `id` (UUID/Int, Primary Key)
*   `brand` (String) - ex: iPhone, Samsung
*   `model` (String) - ex: 13 Pro, S23 Ultra
*   `imei_serial` (String, Unique)
*   `purchase_price` (Float) - Harga beli/modal (Krusial untuk kalkulasi ROI)
*   `daily_rent_price` (Float) - Harga sewa per hari saat ini
*   `status` (String) - Enum: `Available`, `Booked`, `Rented`, `Maintenance`
*   `created_at` (Datetime)

## 2. Table: customers (Dimensi Pelanggan)
*   `id` (UUID/Int, Primary Key)
*   `name` (String)
*   `nik` (String, Unique)
*   `phone_whatsapp` (String)
*   `created_at` (Datetime)

## 3. Table: transactions (Fakta Transaksi)
Tabel fakta utama untuk analitik. Harga harus di-*snapshot* di sini agar laporan tidak berubah jika harga di tabel `devices` di-update suatu hari nanti.
*   `id` (UUID/Int, Primary Key)
*   `device_id` (FK -> devices.id)
*   `customer_id` (FK -> customers.id)
*   `start_date` (Datetime)
*   `end_date_expected` (Datetime)
*   `end_date_actual` (Datetime, Nullable) - Diisi saat HP kembali
*   `snapshot_rent_price` (Float) - Harga sewa per hari pada saat transaksi
*   `total_amount` (Float)
*   `penalty_fee` (Float, Default 0) - Denda telat
*   `status` (String) - Enum: `Pending`, `Active`, `Completed`, `Overdue`, `Canceled`
*   `created_at` (Datetime)
*   `updated_at` (Datetime)