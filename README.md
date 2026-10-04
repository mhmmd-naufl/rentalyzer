# 📱 Notta Rent

Notta Rent adalah project portfolio berbasis web yang dibuat untuk mengelola operasional penyewaan smartphone sekaligus menampilkan bagaimana data bisnis diproses, diorganisir, dan digunakan untuk analisis. Fokus project ini bukan hanya pada tampilan atau booking sederhana, tetapi juga pada kualitas data: transaksi dicatat dengan struktur yang konsisten, harga dibuat sebagai snapshot, status unit dipantau secara real-time, dan data bisa diekspor untuk kebutuhan reporting maupun dashboard analitik.

Project ini terdiri dari backend FastAPI untuk logika bisnis dan API, frontend React + Vite untuk pengalaman pelanggan dan admin, serta database yang bisa dipakai untuk lingkungan lokal maupun deployment. Sistem ini dirancang untuk menangani proses umum seperti:

- katalog unit yang bisa dilihat publik
- booking dengan validasi tanggal dan durasi sewa
- pencatatan transaksi pelanggan dengan data yang siap dianalisis
- pengelolaan admin dan status transaksi
- arsip unit yang sudah tidak aktif
- export data transaksi untuk kebutuhan operasional, insight, dan reporting

Dari sisi portfolio, project ini menunjukkan kemampuan dalam membangun sistem end-to-end yang mencakup data entry, validation, data cleaning, data transformation, dan pemanfaatan data untuk keputusan bisnis.

---

## Apa yang dibuat di project ini

### 1. Public side

Pada sisi publik, pengguna dapat:

- melihat daftar smartphone yang tersedia
- melihat status tiap unit
- memilih durasi sewa yang tersedia
- mengisi data pelanggan untuk pemesanan
- mendapatkan ringkasan harga dan periode sewa
- diarahkan ke WhatsApp admin untuk konfirmasi lanjutan

Flow utama dari publik adalah:

- user memilih unit
- user mengisi nama, NIK, nomor WA, dan tanggal sewa
- system memvalidasi data
- order dibuat ke backend
- admin dikirimkan notifikasi via WhatsApp dengan detail booking

### 2. Admin side

Pada sisi admin, sistem memungkinkan:

- login dengan skema autentikasi sederhana berbasis JWT
- melihat dashboard transaksi dan status unit
- mengubah status transaksi seperti pending, active, completed, dan lain-lain
- menambah atau memperbarui data unit
- mengarsipkan unit tertentu agar tidak tampil lagi di katalog publik
- mengekspor data transaksi ke CSV untuk kebutuhan operasional

### 3. Data dan operasional

Project ini juga fokus pada data yang rapi dan siap dipakai untuk analisis, seperti:

- data transaksi menyimpan snapshot harga saat booking dibuat agar histori tetap akurat
- status unit dipantau agar tidak terjadi double-booking atau overlap data
- daftar unit dan transaksi bisa difilter berdasarkan rentang waktu tertentu
- data bisa diekspor ke CSV untuk kebutuhan reporting, dashboard analitik, atau audit data
- format data disusun agar mudah dikonsumsi untuk analisis performa usaha

Secara umum, project ini mencerminkan alur data yang mirip dengan proses data analytics: input transaksi, validasi, struktur data yang konsisten, lalu output yang siap dipakai untuk insight bisnis.

---

## Tech stack

- Backend: FastAPI
- Frontend: React + Vite
- Database: SQLite untuk development, PostgreSQL-compatible storage untuk deployment
- Auth: JWT
- Validation: Pydantic
- Styling: React UI + custom CSS/Tailwind-style utility classes

---

## Data pipeline & analytics angle

Project ini tidak hanya berfungsi sebagai aplikasi operasional, tetapi juga berperan sebagai contoh data pipeline yang sederhana namun relevan untuk portfolio data analyst.

Beberapa aspek yang menonjol:

- data transaksi dibangun dari event nyata: booking, durasi sewa, status, dan pembayaran
- setiap transaksi menyimpan informasi yang dapat dipakai untuk analisis performa usaha
- data dapat difilter berdasarkan rentang waktu untuk kebutuhan reporting harian atau bulanan
- data unit dan transaksi bisa diekspor untuk diproses lebih lanjut di Excel, SQL, atau dashboard BI
- struktur project membuat proses data lebih mudah dipahami dan dipelajari sebagai bagian dari workflow analisis bisnis

Dengan kata lain, project ini menampilkan kemampuan di tiga area sekaligus:

1. product / business logic
2. data engineering basics
3. business analytics readiness

---

## Struktur dasar project

```text
Rentalyzer/
├── main.py
├── auth.py
├── database.py
├── models.py
├── schemas.py
├── seed_db.py
├── README.md
├── requirements.txt
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── components/
│       ├── services/
│       └── assets/
└── uploads/
```

---

## Cara jalanin project

### Backend

Pastikan Python sudah tersedia, lalu jalankan:

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API utama biasanya bisa diakses di:

- http://localhost:8000
- http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend biasanya bisa dibuka di:

- http://localhost:5173

---

## Default admin login

Untuk akses area admin, akun default yang dipakai biasanya:

- username: admin
- password: admin123

Gunakan akun ini untuk masuk ke panel admin di halaman yang sesuai.

---

## Catatan penting

- Project ini dibuat untuk kebutuhan operasional rental smartphone, tetapi juga dimaksudkan sebagai project portfolio dengan pendekatan data-driven.
- Readme ini dibuat untuk menjelaskan konteks bisnis, cara kerja aplikasi, serta bagaimana data diproses dan digunakan untuk insight.
- Informasi sensitif seperti credential default, konfigurasi deployment, atau detail environment produksi tidak perlu ditampilkan terlalu detail di README.
- Fokus utama README adalah menjelaskan project, fungsi utama, teknologi, serta nilai analitik yang bisa ditunjukkan dalam portfolio.

---

## Ringkasan singkat

Notta Rent adalah aplikasi web untuk mengelola penyewaan smartphone dari sisi pelanggan dan admin. Sistem ini membantu proses booking, pengecekan status unit, pengelolaan transaksi, dan kontrol operasional dengan alur yang sederhana namun tetap terdokumentasi dengan baik.

## 🤝 Kontribusi

Pull request terbuka. Untuk perubahan besar, buka issue terlebih dahulu untuk diskusi.

---

## 📄 Lisensi

MIT License — bebas digunakan dan dimodifikasi untuk keperluan apapun.
