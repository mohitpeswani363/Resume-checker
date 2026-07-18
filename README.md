# ResumeChecker

AI-powered resume review app built with **React**, **Express**, **SQL**, and **JSON**.

Paste your resume, upload a PDF, or sign in to save your check history — with results stored in a SQLite database.

## Features

- Hero section with product branding
- **PDF upload** — extract text from resume PDFs (up to 5 MB)
- Resume textarea with **200-character minimum** validation
- Submit button with **loading state** (disabled while analyzing)
- Smooth **fade-in** results display
- **JWT authentication** — register, sign in, and view personal history
- Tailwind CSS — modern, minimal UI with violet accent
- Express REST API with JSON request/response
- SQLite database for persisting check history
- **Docker & deploy configs** for Render and Railway

## Project structure

```
roaster/
├── client/           # React + Vite + Tailwind frontend
├── server/           # Express API + SQLite + auth + PDF parsing
├── Dockerfile        # Production image (client + server)
├── docker-compose.yml
├── render.yaml       # Render.com deploy config
├── railway.toml      # Railway deploy config
└── README.md
```

## Quick start (local dev)

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret for signing auth tokens (required in production) |
| `ANTHROPIC_API_KEY` | Optional — enables Claude-powered analysis |
| `VITE_API_URL` | Frontend API URL (default: `http://localhost:3001`) |

### 3. Run the app

```bash
# Terminal 1 — API (http://localhost:3001)
npm run dev:server

# Terminal 2 — React app (http://localhost:5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173).

## Docker (production)

Build and run everything in one container:

```bash
docker compose up --build
```

Open [http://localhost:3001](http://localhost:3001) — the server serves both the API and the built React app.

Set secrets via environment or a `.env` file:

```bash
JWT_SECRET=your-long-random-secret
ANTHROPIC_API_KEY=sk-ant-...
docker compose up --build
```

## Deploy

### Render

1. Push this repo to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect the repo — Render reads `render.yaml` automatically
4. Set `ANTHROPIC_API_KEY` in the dashboard (optional)
5. Deploy

### Railway

1. Push to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Deploy from repo — Railway uses `Dockerfile` via `railway.toml`
4. Set `JWT_SECRET` and `ANTHROPIC_API_KEY` in Railway variables

## API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Sign in |
| GET | `/api/auth/me` | Bearer | Current user |
| POST | `/api/upload` | — | Upload PDF, get extracted text |
| POST | `/api/check` | Optional | Analyze resume text |
| GET | `/api/check/history` | Bearer | User's recent checks |

### POST `/api/auth/register`

```json
{ "email": "you@example.com", "password": "secret123", "name": "Jane" }
```

### POST `/api/upload` (multipart/form-data)

Field: `resume` — PDF file, max 5 MB.

### POST `/api/check`

```json
{ "resumeText": "Your full resume...", "sourceType": "text" }
```

Send `Authorization: Bearer <token>` to associate the check with your account.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Express 4, Node.js |
| Database | SQLite (SQL schema + JSON columns) |
| Auth | JWT + bcrypt |
| PDF | multer + pdf-parse |
| AI | Anthropic Claude (optional) |
| Deploy | Docker, Render, Railway |

## License

MIT
