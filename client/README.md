# ResumeChecker — Client

React frontend for the ResumeChecker app.

## Stack

- React 18 (functional components, single `App.jsx`)
- Vite
- Tailwind CSS

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173).

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | Express API base URL |

Leave `VITE_API_URL` empty when using the Docker production build (same origin).

## Features

- **PDF upload** — sends file to `/api/upload`, fills textarea with extracted text
- **Auth** — sign in / register modal, JWT stored in localStorage
- **History** — signed-in users see their recent check scores
- **200-char validation**, loading state, fade-in results

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (output in `dist/`) |
| `npm run preview` | Preview production build |
