# 📱 Rentalyzer

> Sistem manajemen penyewaan smartphone berbasis web — dirancang dengan pendekatan **data-first** untuk memfasilitasi operasional sekaligus menjadi *data pipeline* untuk analisis performa bisnis.

![Stack](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)
![Stack](https://img.shields.io/badge/Frontend-React_Vite-61DAFB?style=for-the-badge&logo=react)
![Stack](https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite)
![Stack](https://img.shields.io/badge/Auth-JWT-000000?style=for-the-badge&logo=jsonwebtokens)

---

## ✨ Fitur Utama

### 🛍️ Customer Side (Publik)
- **Katalog Real-time** — Menampilkan daftar HP dengan status `Available` / `Booked` / `Rented` yang diambil langsung dari database
- **Smart Booking Form** — Input Nama, NIK KTP, No. WhatsApp, durasi sewa, dan tipe jaminan dengan validasi otomatis
- **Conflict Detection** — Mencegah double-booking dengan pengecekan tanggal secara real-time
- **WhatsApp Handoff** — Setelah booking, pelanggan langsung diarahkan ke WhatsApp Admin dengan pesan yang sudah terformat

### 🖥️ Admin Side (Protected)
- **Secure Login** — Autentikasi berbasis JWT, session tersimpan di localStorage
- **Quick Stats Dashboard** — Omzet bulan ini, HP aktif disewa, unit overdue, total aset aktif
- **Transaction Control** — Ubah status transaksi: `Pending → Active → Completed / Overdue / Canceled`
- **Manual Penalty Input** — Tambah denda keterlambatan langsung dari dashboard
- **Master Data HP** — Tambah unit baru dan arsipkan (*soft delete*) unit yang sudah tidak aktif
- **CSV Export** — Export raw data transaksi siap pakai untuk Looker Studio / Power BI

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)           │
│   /           →  Katalog Publik + Booking Form       │
│   /admin       →  Login Screen / Admin Dashboard     │
└──────────────────────────┬──────────────────────────┘
                           │ HTTP REST (fetch API)
                           ▼
┌─────────────────────────────────────────────────────┐
│                BACKEND (FastAPI + Python)             │
│   GET  /api/devices          → Katalog HP (public)   │
│   POST /api/transactions     → Buat Booking (public) │
│   POST /api/auth/login-json  → Login Admin           │
│   GET  /api/transactions     → Semua Transaksi 🔒    │
│   PUT  /api/transactions/:id/status → Update 🔒      │
│   POST /api/devices          → Tambah HP 🔒          │
│   PUT  /api/devices/:id/archive → Arsipkan HP 🔒     │
│   GET  /api/export/excel     → Export CSV 🔒         │
└──────────────────────────┬──────────────────────────┘
                           │ SQLAlchemy ORM
                           ▼
┌─────────────────────────────────────────────────────┐
│              DATABASE (SQLite - rentalyzer.db)       │
│   devices  │  customers  │  transactions  │  admins  │
└─────────────────────────────────────────────────────┘
```

> 🔒 = Endpoint dilindungi JWT Bearer Token (Admin only)

---

## 🛡️ Keamanan

| Layer | Implementasi |
|---|---|
| **Autentikasi** | JWT (HS256), expire 24 jam |
| **Password** | Bcrypt hashing via `passlib` |
| **Rate Limiting** | 60 req/menit (publik), 10 req/menit (booking) via `slowapi` |
| **HTTP Headers** | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `HSTS` |
| **CORS** | Whitelist origin dari `.env` |
| **Input Validation** | Pydantic v2 — sanitasi XSS, validasi NIK 16 digit, format nomor WA |
| **Soft Delete** | Device tidak pernah dihapus dari DB, hanya diarsipkan |

---

## 📁 Struktur Proyek

```
rentalyzer/
│
├── 📄 main.py               # FastAPI app — semua endpoint
├── 📄 models.py             # SQLAlchemy ORM models
├── 📄 schemas.py            # Pydantic schemas (validasi input/output)
├── 📄 auth.py               # JWT auth logic
├── 📄 database.py           # Engine & session SQLAlchemy
├── 📄 seed_db.py            # Seeder data awal (opsional)
├── 📄 view_db.py            # Utilitas inspeksi database
├── 📄 test_security.py      # 11 automated security tests
├── 📄 .env                  # Konfigurasi environment (tidak di-commit)
├── 📄 .env.example          # Template konfigurasi
├── 📄 .gitignore
│
└── 📁 frontend/             # React + Vite
    ├── 📄 vite.config.js
    ├── 📄 package.json
    └── 📁 src/
        ├── 📄 App.jsx           # Root component + routing
        ├── 📄 index.css         # Global styles (Tailwind)
        ├── 📁 components/
        │   ├── Catalog.jsx          # Halaman katalog publik
        │   ├── BookingModal.jsx     # Form booking pelanggan
        │   ├── Navbar.jsx           # Navigasi (publik/admin)
        │   ├── AdminLoginScreen.jsx # Halaman login admin
        │   ├── AdminDashboard.jsx   # Dashboard admin
        │   └── LoginModal.jsx       # Modal login
        └── 📁 services/
            ├── api.js           # Semua fungsi HTTP ke FastAPI
            └── dataService.js   # Helper (formatRupiah, konstanta)
```

---

## 🚀 Cara Menjalankan (Development)

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Clone & Setup Backend

```bash
# Clone repository
git clone https://github.com/mhmmd-naufl/rentalyzer.git
cd rentalyzer

# Buat virtual environment
python -m venv venv

# Aktivasi venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy pydantic passlib pyjwt python-dotenv slowapi
```

### 2. Konfigurasi Environment

```bash
# Salin template .env
cp .env.example .env

# Edit .env dan isi JWT_SECRET_KEY dengan string acak yang kuat
# Contoh: openssl rand -hex 32
```

Isi `.env`:
```env
ENVIRONMENT=development
JWT_SECRET_KEY=your_random_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=sqlite:///./rentalyzer.db
```

### 3. Jalankan Backend

```bash
# Dari folder root rentalyzer/
uvicorn main:app --reload --port 8000
```

Backend berjalan di `http://localhost:8000`  
Dokumentasi API otomatis tersedia di `http://localhost:8000/docs`

> 💡 Pada startup pertama, server otomatis membuat database dan menyemai **4 sample device** serta akun admin default.

### 4. Setup & Jalankan Frontend

```bash
# Buka terminal baru
cd frontend

# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

Frontend berjalan di `http://localhost:5173`

---

## 🔑 Akun Admin Default

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

> ⚠️ **Ganti password admin** setelah pertama kali login di lingkungan produksi.

Akses halaman admin di: `http://localhost:5173/admin`

---

## 📊 Data Pipeline & Analytics

Rentalyzer dirancang sebagai sumber data utama untuk analisis bisnis. CSV yang diekspor dari Admin Dashboard mencakup:

| Kolom | Keterangan |
|---|---|
| `transaction_id` | ID unik transaksi |
| `status` | Pending / Active / Completed / Overdue / Canceled |
| `customer_name`, `customer_nik` | Data penyewa |
| `device_brand`, `device_model`, `device_imei` | Data unit |
| `purchase_price` | Harga modal (untuk kalkulasi ROI) |
| `snapshot_daily_rent_price` | Harga sewa saat transaksi terjadi |
| `start_date`, `end_date_expected`, `end_date_actual` | Periode sewa |
| `duration_days` | Durasi aktual |
| `total_amount` | Pendapatan sewa |
| `penalty_fee` | Denda keterlambatan |

### Metrik Analitik yang Didukung
- 📈 **Asset Utilization Rate** — Hari sewa vs hari idle per unit
- 💰 **Return on Investment (ROI)** — Break-even point per unit HP
- 📅 **Monthly Recurring Revenue (MRR)** — Tren pendapatan harian/bulanan
- 👥 **Customer Retention** — Deteksi penyewa berulang via NIK/WhatsApp

---

## 🧪 Pengujian Keamanan

```bash
# Jalankan backend terlebih dahulu, lalu:
python test_security.py
```

Suite test mencakup 11 skenario:
- ✅ CORS enforcement
- ✅ Admin endpoint tanpa token (harus 401)
- ✅ Admin endpoint dengan token invalid (harus 401)
- ✅ XSS payload pada input booking (harus di-sanitasi)
- ✅ Booking dengan NIK invalid (harus 422)
- ✅ Booking dengan nomor WA invalid (harus 422)
- ✅ HTTP Security Headers tersedia
- ✅ Rate limiting aktif

---

## 🗺️ Roadmap

- [x] **Phase 1** — Backend FastAPI + SQLite + Auth
- [x] **Phase 2** — Frontend React MVP (Katalog, Booking, Admin Dashboard)
- [x] **Phase 3a** — Integrasi full-stack (Frontend ↔ FastAPI ↔ SQLite)
- [ ] **Phase 3b** — Webhook n8n → Google Sheets auto-sync
- [ ] **Phase 4** — Dashboard analitik Looker Studio / Power BI

---

## 🤝 Kontribusi

Pull request terbuka. Untuk perubahan besar, buka issue terlebih dahulu untuk diskusi.

---

## 📄 Lisensi

MIT License — bebas digunakan dan dimodifikasi untuk keperluan apapun.
