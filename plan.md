# plan.md (Development Roadmap)

## Phase 1: Data Architecture & Backend Setup (FastAPI)
*   [ ] Inisialisasi *environment* Python dan FastAPI.
*   [ ] Translasi `schema.md` menjadi SQLAlchemy models.
*   [ ] Buat *endpoint* CRUD untuk `Devices` (Katalog HP).
*   [ ] Buat *endpoint* transaksi booking (Input penyewa -> generate ID booking).
*   [ ] Buat *endpoint* Analytics Export (`/api/export/excel`).

## Phase 2: Frontend MVP (React Vite)
*   [ ] Setup React (Vite) dan konfigurasi Tailwind.
*   [ ] Bangun UI `Katalog` publik (Grid cards, ketersediaan stok).
*   [ ] Bangun UI `Booking Form` dan *logic* redirect ke WhatsApp.
*   [ ] Bangun UI `Admin Dashboard` (Tabel transaksi dengan fitur filter/sort).

## Phase 3: Analytics Integration & Automation
*   [ ] Setup n8n *webhook* (Opsional).
*   [ ] Integrasikan *endpoint* transaksi baru agar *push* data otomatis ke Google Sheets.
*   [ ] Validasi keakuratan *raw data* yang di-ekspor (Format tanggal dan kalkulasi harga).

## Phase 4: Data Visualization (Looker Studio / PowerBI)
*   [ ] Hubungkan Google Sheets / raw CSV ke *dashboard* analitik.
*   [ ] Buat visualisasi metrik sesuai `prd.md` (ROI, Utilization Rate, Revenue Trends).