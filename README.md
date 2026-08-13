# Adyapan AI

All-in-one placement & learning platform for engineering students — job discovery, DSA/coding practice with an AI judge, aptitude training, interviews, resume analysis, and a subscription billing engine.

## Architecture

| Component | Stack | Location |
|---|---|---|
| **Frontend** | Next.js 16 (Turbopack), React 19, TypeScript, Tailwind 4, Zustand, Socket.io client | `frontend/` |
| **Backend** | Node 22, Express 5, TypeScript, Prisma 7 (PostgreSQL/Neon), Socket.io, Puppeteer/scrapers | `backend/` |
| **Code executor** | Piston (isolated container API for code submissions) | `piston/` |

## Prerequisites

- Node.js >= 22.12
- npm
- PostgreSQL (or Neon serverless Postgres)
- Optional: Piston instance for the coding judge

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env   # fill in values
npm install
npm run prisma:generate
npm run prisma:migrate      # main schema
npm run prisma:migrate:user # per-user schema
npm run dev                 # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env   # set NEXT_PUBLIC_API_URL
npm install
npm run dev             # http://localhost:3000
```

## Environment variables

Copy the relevant `.env.example` and fill in real values. Never commit `.env`.

**Backend essentials** (`backend/.env`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL connection (Prisma) |
| `JWT_SECRET` | JWT signing secret — must be long/random in production |
| `ADMIN_REGISTER_SECRET` | Gate for admin registration |
| `FRONTEND_URL` | Allowed CORS origin |
| `NODE_ENV` | Set to `production` in production (enables JWT guard) |
| `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` | AI providers |
| `CLOUDINARY_*` | File uploads |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payments |

**Frontend** (`frontend/.env`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key |

## Tests & checks

```bash
# Backend (unit/integration — no DB required)
cd backend && npm test && npm run typecheck

# Frontend
cd frontend && npm test && npx tsc --noEmit && npm run build
```

CI runs these on every push/PR via GitHub Actions (`.github/workflows/ci.yml`).

## Deployment

- **Backend** → Railway (`railway.json`). Set all env vars in the service, including a strong `JWT_SECRET`. Run `npm run prisma:migrate` once.
- **Frontend** → Vercel. Point `NEXT_PUBLIC_API_URL` at the deployed backend.
- **Code executor** → Piston container, exposed via `PISTON_URL` on the backend.

## Security notes

- Backend enforces `helmet`, CORS allowlist, rate limiting, and JWT verification.
- The server refuses to boot in `NODE_ENV=production` without a real `JWT_SECRET`.
- **Rotate the Neon database password immediately if it has ever been committed to git** (an old seed script contained a hardcoded connection string).
