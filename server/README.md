# ResumeChecker — Server

Express API for resume analysis with SQLite persistence, JWT auth, and PDF parsing.

## Stack

- Express 4
- SQLite (SQL + JSON column for feedback)
- JWT authentication (bcrypt + jsonwebtoken)
- PDF text extraction (multer + pdf-parse)
- Optional Anthropic Claude integration

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The API runs at [http://localhost:3001](http://localhost:3001).

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin |
| `JWT_SECRET` | dev fallback | Secret for signing JWT tokens |
| `ANTHROPIC_API_KEY` | — | Claude API key (falls back to local rules) |

## Database

Schema in `db/schema.sql`:

- `users` — email, password hash, name
- `resume_checks` — resume text, score, JSON feedback, optional user_id

SQLite file: `db/resume_checker.db`

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Sign in, get JWT |
| GET | `/api/auth/me` | Bearer | Current user profile |
| POST | `/api/upload` | — | Upload PDF, extract text |
| POST | `/api/check` | Optional | Analyze resume |
| GET | `/api/check/history` | Bearer | User's last 10 checks |

## Production

In production the server also serves the built React app from `../client/dist`.

Build the client first, then start the server:

```bash
cd ../client && npm run build
cd ../server && npm start
```

Or use Docker from the project root: `docker compose up --build`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with file watch |
| `npm start` | Start production server |
