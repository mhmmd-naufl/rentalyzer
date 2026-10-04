# Rentalyzer

Smartphone rental management system with a data-driven business workflow, built as a full-stack portfolio project for product operations, admin control, and business analytics.

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.115+-green?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python" alt="Python 3.10+" />
</p>

## Overview

Rentalyzer is a web application designed to manage a smartphone rental business end-to-end. It combines customer-facing rental flows, an admin dashboard, and structured transaction data that is ready for reporting and analysis.

This project is intended to demonstrate practical capabilities in:

- full-stack application development
- business process automation
- inventory and booking management
- API design and backend logic
- admin operations and reporting
- data-oriented portfolio thinking for analytics and business intelligence

## Why this project is valuable

This project is not only a booking app. It is designed to reflect how a real rental business operates in practice:

- inventory is monitored by device status
- bookings are validated by date, duration, and pricing rules
- transactions store pricing snapshots for accurate historical records
- admin workflows can update order status and manage rental assets
- reporting data can be exported for further analysis in Excel, SQL, or BI tools

This makes the project suitable for a portfolio because it shows both product thinking and data discipline.

## Core Features

### Customer-facing rental flow

- device catalog with availability status
- booking form for customer information and rental duration
- pricing calculation based on rental period
- validation for dates and rental rules
- WhatsApp handoff for order confirmation and communication

### Admin dashboard and operational control

- secure admin login using JWT-based authentication
- order monitoring and transaction status updates
- device management and stock visibility
- status tracking for available, booked, active, overdue, completed, and canceled transactions
- archived or inactive devices omitted from public catalog display
- CSV export for operational and analytical use

### Business/data layer

- transaction records capture pricing at booking time
- rental lifecycle is tracked to reduce overlap and double-booking
- overdue automation helps keep inventory and status consistent
- exportable records support reporting and dashboarding needs
- system structure is organized for future analytics, forecasting, and business insights

## Tech Stack

- Backend: FastAPI
- Frontend: React + Vite
- Database: SQLite for local development, PostgreSQL-compatible structure for deployment scenarios
- Authentication: JWT
- Validation: Pydantic
- Scheduling: APScheduler
- Security: CORS, rate limiting, and HTTP hardening middleware
- Styling: custom React UI + CSS

## Project Structure

```text
Rentalyzer/
├── auth.py                  # admin auth and JWT flow
├── database.py             # database configuration and session management
├── main.py                 # FastAPI app, endpoints, scheduler, and business logic
├── models.py               # SQLAlchemy models
├── schemas.py              # request/response schemas
├── seed_db.py              # seed data for default admin and sample devices
├── requirements.txt        # Python dependencies
├── README.md               # project documentation
├── prd.md                  # product requirements document
├── schema.md               # database/schema context
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── components/
│       ├── services/
│       ├── assets/
│       ├── main.jsx
│       └── index.css
├── uploads/
│   └── devices/
└── .venv/
```

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd Rentalyzer
```

### 2. Set up the backend

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API documentation will be available at:

- http://localhost:8000/docs
- http://localhost:8000/redoc

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

Then open:

- http://localhost:5173

## Default Admin Login

```text
Username: admin
Password: admin123
```

## API and Business Flow

The system follows a practical business workflow:

1. customer browses available devices
2. customer selects rental duration and device
3. booking is validated and saved with pricing snapshot
4. admin reviews and manages transaction status
5. overdue and inventory rules are enforced automatically
6. exportable records support business reporting and analysis

## Portfolio Highlights

This project demonstrates a combination of:

- product design thinking
- operational workflow management
- backend API implementation
- frontend application development
- structured data handling
- business analytics readiness

It is a strong example of a portfolio project that looks beyond a simple CRUD app and instead reflects real business logic and data discipline.

## Future Improvements

Planned improvements may include:

- enhanced reporting dashboard with charts and KPIs
- user roles and permission management
- automated notifications via WhatsApp or email
- deeper analytics for utilization, revenue, and retention
- PostgreSQL deployment setup for production readiness
- CI/CD and Docker support for deployment automation

## License

This project is open for learning and portfolio use. Please check the repository license if you plan to reuse or adapt it commercially.

## Contributing

Pull requests are welcome. For larger changes, please open an issue first to discuss the idea and scope.
