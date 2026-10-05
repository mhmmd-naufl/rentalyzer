# Rentalyzer

Smartphone rental management system with a data-driven business workflow — public catalog + booking, admin dashboard, analytics with AI summary. Full-stack portfolio project: FastAPI backend on Railway, React (Vite) frontend on Vercel.

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.115+-green?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/OpenRouter-AI-8b5cf6" alt="OpenRouter" />
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python" alt="Python 3.10+" />
</p>

## Overview

End-to-end rental operations with analytics-ready data at its core:

- customers browse devices and book without an account (hourly 3/6/9/12/24h + daily packages)
- bookings snapshot pricing, so master-price changes never corrupt history
- admins manage stock, order status, extensions, and overdue automation
- analytics aggregates revenue, utilization, and ROI per unit
- OpenRouter-powered AI summary delivers a minimalist 2-sentence business brief with multi-model fallback

## Core Features

### Customer flow
- real-time device catalog (archived units hidden)
- booking form (name, NIK, WhatsApp, duration, guarantee) with price calculation
- WhatsApp handoff for payment/DP confirmation

### Admin & operations
- JWT login (`/api/auth`), rate-limited and CORS-hardened API
- device CRUD + archive/restore + photo upload (Supabase Storage)
- transaction lifecycle `Pending → Active → Completed` (+ `Overdue`, `Canceled`)
- rental extension by extra hours, per-device history, WA notify-link generator
- overdue automation via APScheduler; stale-booked release
- Excel/CSV export for BI ingestion

### Analytics & AI
- `GET /api/analytics/summary`: overview, 12-month revenue chart, per-device stats (ROI, rented days), top-5 devices
- `GET /api/analytics/summary/ai`: `{ summary, source, source_label, generated_at }` — max 2 short Indonesian sentences; `source` is `"openrouter"` or `"fallback"`
- OpenRouter multi-model fallback chain with transient-error retry, length-cutoff rejection, and deterministic sentence-trimming post-processing

## Tech Stack

- Backend: FastAPI (Uvicorn), SQLAlchemy 2.0, Pydantic, APScheduler, SlowAPI, PyJWT/Bcrypt, `requests`
- Frontend: React + Vite, Tailwind CSS, Recharts, lucide-react
- Database: PostgreSQL (prod) / SQLite (local MVP)
- AI: OpenRouter Chat Completions (non-streaming)
- Deploy: Railway (backend) + Vercel (frontend SPA)

## Project Structure

```text
Rentalyzer/
├── main.py                  # FastAPI app: endpoints, scheduler, AI summary
├── models.py                # SQLAlchemy models (devices, customers, transactions, admins)
├── schemas.py               # Pydantic request/response contracts
├── auth.py                  # JWT auth (/api/auth)
├── database.py              # engine + sessions
├── seed_db.py               # initial data
├── test_all_features.py / test_rental_pricing.py / test_security.py
├── prd.md / schema.md / plan.md / design.md / agents.md  # pindah ke docs/ (lokal, tidak di-push)
├── DOKUMENTASI_PRIBADI.md   # personal dev journal (Indonesian)
├── frontend/
│   ├── vercel.json
│   └── src/{components/, services/, App.jsx, main.jsx}
└── uploads/devices/
```

## Getting Started

### Backend

```bash
python -m venv venv
# Windows: venv\Scripts\activate | macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill secrets (see Environment)
uvicorn main:app --reload --port 8000
```

Docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

### Environment (backend `.env`)

```env
JWT_SECRET_KEY=<32-byte-hex>  JWT_ALGORITHM=HS256  ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=https://your-domain.com,http://localhost:5173
DATABASE_URL=sqlite:///./rentalyzer.db   # or postgres URL
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODELS=qwen/qwen3.8-27b:free,apodex/apodex-1.1-mini:free,inclusionai/ling-3.0-flash-sante:free
SUPABASE_URL=...  SUPABASE_SERVICE_KEY=...
ADMIN_WHATSAPP=628xxxxxxxxxx
```

Frontend: `VITE_API_BASE_URL` (defaults to the Railway URL) and optional `VITE_ADMIN_WA_NUMBER`. Never put AI keys in `VITE_*`.

Default dev admin: `admin / admin123` (change in production).

## API & Business Flow

1. customer browses catalog → 2. books with duration → 3. booking saved as `Pending` with price snapshot → 4. admin confirms via WhatsApp and drives status → 5. scheduler flags overdue → 6. analytics + AI summary read the aggregates → 7. records export for BI.

## License

Open for learning and portfolio use. Check the repository license before commercial reuse.
