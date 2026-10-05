# Frontend Rentalyzer (React + Vite)

> Panduan vibecoding frontend. Detail sistem desain: lihat `../docs/design.md`.

## Setup

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # output dist/ (yang di-deploy Vercel)
```

`vercel.json` berisi SPA rewrite (`/(.*)` → `/index.html`). Routing hash/custom di `src/App.jsx` — tidak memakai react-router.

## Struktur `src/`

*   `App.jsx` — shell + routing (publik vs admin) + toast global.
*   `main.jsx`, `index.css`, `App.css` — entry + gaya global Tailwind.
*   `components/` — `Navbar`, `Catalog`, `BookingModal`, `LoginModal`, `AdminLoginScreen`, `AdminDashboard`, `AnalyticsDashboard`, `DeviceHistoryModal`, `Pagination`.
*   `services/api.js` — semua fetch; base URL dari `VITE_API_BASE_URL` (fallback URL Railway). Token: `notta_rent_token` (fallback `rentalyzer_token`).
*   `services/dataService.js` — `formatRupiah()` + konstanta WA (`VITE_ADMIN_WA_NUMBER`).
*   `assets/` — aset statis.

## Env Frontend (JANGAN taruh secret!)

```env
VITE_API_BASE_URL=https://rentalyzer-production.up.railway.app
VITE_ADMIN_WA_NUMBER=628xxxxxxxxxx
```

API key AI dan secret lain HANYA milik backend.

## Konvensi Wajib

1. Rupiah selalu via `formatRupiah()`; tanggal via `toLocaleDateString/String("id-ID", {year: "numeric", ...})` — `"4-digit"` TIDAK VALID (pernah bikin blank page).
2. Setiap fetch: state `loading` + `error` + empty-state ("Belum ada data..."), jangan `return null` diam-diam di layar penuh.
3. Kartu: `rounded-2xl border border-slate-100 bg-slate-50 p-4`; tombol primer: `rounded-xl border-indigo-200 bg-white text-indigo-700`.
4. Chart: Recharts + `ResponsiveContainer`, tick `fontSize: 10`, tanpa `axisLine/tickLine`.
5. Teks UI Bahasa Indonesia. Label AI: `source === "openrouter"` → "Sumber: OpenRouter AI", else "Sumber: Fallback".
