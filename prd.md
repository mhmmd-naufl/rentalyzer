# prd.md (Product Requirements Document)

## 1. Product Overview
Sistem manajemen penyewaan HP (Booking Web & Admin Dashboard) yang dirancang dengan pendekatan *data-first*. Sistem ini tidak hanya memfasilitasi operasional penyewaan, tetapi juga bertindak sebagai sumber data utama (Data Pipeline) untuk analisis performa bisnis, utilitas aset, dan profitabilitas.

## 2. Target Audience (User Personas)
*   **Customer (Penyewa):** Membutuhkan antarmuka yang clean, cepat, dan intuitif untuk melihat ketersediaan HP dan melakukan booking.
*   **Admin (Pemilik Bisnis):** Membutuhkan dashboard terpusat untuk memonitor ketersediaan stok, mengubah status pesanan, dan mengunduh laporan (Excel/CSV) untuk analisis lanjutan.

## 3. Core Features
### Customer Side (Frontend)
*   **Katalog Real-time:** Menampilkan daftar HP dengan status `Available` atau `Booked`.
*   **Booking Form:** Input Nama, NIK, No. WhatsApp, Durasi Sewa, dan Tipe Jaminan.
*   **WhatsApp Handoff:** Redirect form yang telah diisi ke WhatsApp Admin untuk konfirmasi pembayaran/DP.

### Admin Side (Dashboard & Backend)
*   **Master Data Management:** CRUD data HP (Tipe, IMEI, Harga Modal, Harga Sewa).
*   **Transaction Status Control:** Mengubah status transaksi (`Pending` -> `Active` -> `Completed` / `Overdue`).
*   **Data Export (Data Analyst Focus):** Tombol *Export to Excel/CSV* yang mencakup raw data transaksi dan durasi sewa, disiapkan untuk *ingestion* ke Looker Studio / PowerBI.

## 4. Key Analytics Metrics (Portofolio Requirements)
Sistem harus mampu menangkap *data points* untuk menjawab metrik berikut:
*   **Asset Utilization Rate:** Berapa hari sebuah HP disewa dalam sebulan vs nganggur.
*   **Return on Investment (ROI):** Waktu yang dibutuhkan agar akumulasi pendapatan sewa menutupi "Harga Modal" HP tersebut.
*   **Monthly Recurring Revenue (MRR):** Tren pendapatan harian/bulanan.
*   **Customer Retention:** Deteksi nomor WA/NIK yang melakukan transaksi lebih dari satu kali.