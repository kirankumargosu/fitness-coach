# Fitness Coach

A gym activity logger for two lifters (Kiran & Tony): workouts, exercises,
sets, reps, weight, date/time, duration, and notes, with a history view and
a per-lifter personal-bests view.

## Stack

- **Frontend**: React + TypeScript (Vite), React Router, Axios
- **Backend**: Python + FastAPI, SQLAlchemy ORM, dependencies managed with `uv`
- **Database**: SQLite (single file, persisted via a Docker named volume)
- **Deployment**: Docker Compose, fronted by an nginx reverse proxy ("controller")

## Architecture

```
                 ┌─────────────────────────┐
  outside ──────▶│  nginx (edge, port 8080)│   <- only published port
                 └──────────┬──────────────┘
                    /api/*  │  everything else
                 ┌──────────▼──────┐   ┌───────────────┐
                 │ backend          │   │ frontend       │
                 │ FastAPI :8000    │   │ nginx+SPA :80  │
                 └────────┬─────────┘   └───────────────┘
                          │
                 ┌────────▼─────────┐
                 │ SQLite (volume)  │
                 └──────────────────┘
```

The `nginx` service is the single container exposed outside the Docker
network — the "controller" — routing `/api/*` (and `/docs`,
`/openapi.json`) to the backend and everything else to the frontend's own
nginx, which serves the built React app.

## Data model

- **User** — seeded on first boot: Kiran, Tony, Anish
- **Exercise** — shared catalog (e.g. "Bench Press", "Jogging"), created on
  the fly when you type a new name while logging a set
- **WorkoutSession** — one gym visit: user, date/time, optional title,
  duration, notes
- **SetEntry** — one logged set within a session, in one of two flavors,
  chosen per row when logging (a "Reps" / "Time" toggle):
  - **strength**: reps, weight, unit (kg/lb) — "3 x 8 @ 60kg"
  - **cardio**: duration, distance, unit (km/mi) — "20 min, 5.2 km jog"

  A set needs at least reps or a duration; the rest (weight, distance) is
  optional, so bodyweight sets and duration-only cardio both work fine.
  Personal bests only consider strength sets — there's no "weight PB" for
  a jog.

  The database schema was migrated in place from an earlier strength-only
  version; `backend/app/migrations.py` handles that automatically on
  startup for existing deployments — no data is lost, no manual steps
  needed.

## Running locally (development)

Backend:

```bash
cd backend
uv sync
DB_PATH=./dev.db uv run uvicorn app.main:app --reload
```

Frontend (in a second terminal):

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:8000`, so open
`http://localhost:5173`.

## Access control (HTTP Basic Auth)

The edge `nginx` service gates the whole app — UI, API, and `/docs` — behind
a simple username/password prompt. Good enough for a fixed, trusted set of
users; not meant to withstand a determined attacker.

**One-time setup, before your first build:**

```bash
cd nginx

# Create the credentials file — repeat the second command for each user.
docker run --rm httpd:2.4-alpine htpasswd -nbB kiran 'choose-a-password' > .htpasswd
docker run --rm httpd:2.4-alpine htpasswd -nbB tony  'choose-a-password' >> .htpasswd
docker run --rm httpd:2.4-alpine htpasswd -nbB anish 'choose-a-password' >> .htpasswd
```

(No `htpasswd` binary locally? The `docker run` approach above needs
nothing installed except Docker itself, which you already have.)

`.htpasswd` is gitignored — it's baked into the `nginx` image at build
time via its `Dockerfile`, so it never needs committing. It just needs to
exist in `nginx/` before you run `docker compose build`.

To add, remove, or change a password later: edit `nginx/.htpasswd` (rerun
the `htpasswd` command above and redirect into it), then rebuild just that
service:

```bash
docker compose up -d --build nginx
```

Browsers cache the credentials per-origin after the first prompt, so
you'll only be asked once per device/browser, not on every request.

**Bonus:** the app defaults its active-user tab to whichever username you
authenticated with (Kiran logs in → Kiran's tab is active first), as long
as the Basic Auth username matches an app user by name. Manually switching
tabs still works as normal and is remembered per-device after that.

## Running with Docker Compose (production-style)

```bash
cp .env.example .env   # adjust HOST_DATA_DIR / HOST_PORT if needed
docker compose up --build -d
```

Two settings are overridable via `.env` (or plain shell env vars):

- `HOST_DATA_DIR` — host folder the SQLite file is persisted to. Defaults
  to `/home/kiran/data`.
- `HOST_PORT` — host port the nginx controller is published on. Defaults
  to `6060`. Avoid ports on the browser-restricted list (e.g. 6666/6667) —
  Chrome/Firefox refuse to connect to those at all.

Then browse to `http://<host>:6060` (or whatever `HOST_PORT` you set). Put
your existing gosulab reverse proxy in front of this stack's `nginx`
service for external (outside-LAN) access.

Data persists on the host at `HOST_DATA_DIR`, so `docker compose down` /
`up` keeps all logged workouts regardless of container rebuilds.

## API summary

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/users` | List Kiran & Tony |
| GET | `/api/exercises` | List known exercises |
| POST | `/api/exercises` | Add a new exercise to the catalog |
| GET | `/api/sessions?user_id=` | List sessions (optionally filtered) |
| POST | `/api/sessions` | Log a new session with its sets |
| GET | `/api/sessions/{id}` | Full session detail |
| PATCH | `/api/sessions/{id}` | Edit session metadata |
| DELETE | `/api/sessions/{id}` | Delete a session |
| POST | `/api/sessions/{id}/sets` | Add a set to an existing session |
| DELETE | `/api/sessions/{id}/sets/{set_id}` | Remove a set |
| GET | `/api/users/{id}/personal-bests` | Max weight per exercise |

Interactive docs at `/docs` once the backend is running.

## Next ideas (not built yet)

- Editing/deleting individual sets from the History UI (API already
  supports it — `DELETE /api/sessions/{id}/sets/{set_id}`)
- Charts of weight progression over time per exercise
- Weekly/monthly volume summaries per lifter
- HTTPS on the edge nginx (e.g. via Tailscale or a Let's Encrypt sidecar)