# Iron Log — Gym Tracker

A gym activity logger for any number of lifters, with open sign-up:
workouts, exercises, sets, reps, weight, date/time, duration, and notes,
plus a personal-bests view anyone can browse for anyone else. Everyone
manages their own workout log; one designated admin can manage everyone's.

## Stack

- **Frontend**: React + TypeScript (Vite), React Router, Axios
- **Backend**: Python + FastAPI, SQLAlchemy ORM, dependencies managed with `uv`
- **Database**: SQLite (single file, persisted via a Docker named volume)
- **Deployment**: Docker Compose, fronted by an nginx reverse proxy ("controller")

## Architecture

```
                 ┌─────────────────────────┐
  outside ──────▶│  nginx (edge, port 6060)│   <- only published port
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

- **User** — created via open registration (any name, no fixed roster);
  see "Access control" below for how roles work. Also carries an optional
  **profile**: first/last name (used for avatar initials, visible to
  everyone), and private personal details — date of birth, gender,
  height, weight, and a free-text goal — visible only to that person and
  the admin. Edited from the avatar in the top-right corner.
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

  Personal bests are also ranked against everyone else who's logged the
  same exercise: each entry shows your rank ("#2 of 3"), what percentage
  of lifters you beat, and — if you're not #1 — who is and by how much.
  kg/lb are converted for fair comparison even if people log in different
  units; each person's own number still displays in the unit they used.

  The database schema has been migrated in place a few times now (from an
  earlier strength-only version, then to add auth, then profile fields);
  `backend/app/migrations.py` handles all of it automatically on startup
  for existing deployments — no data is lost, no manual steps needed.

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

## Access control (in-app login)

There's no HTTP Basic Auth in front anymore — access control lives in the
app itself, which is what makes per-user permissions possible (nginx alone
can't tell "Sam editing his own workout" from "Sam editing Kiran's").

**How it works:**

- The whole app sits behind a login screen. Nobody sees any data — not
  even their own — until they log in.
- **Registration is open**: anyone can create an account with any name
  and password, no invite or pre-existing roster needed. Names must be
  unique (case-insensitive).
- **Login**: name + password. Sessions last 30 days (a cookie, not a
  token you need to manage).
- **Permissions**:
  - Everyone can browse the **Users** directory and view anyone's
    **personal bests**.
  - A regular member's **workout history** (the actual logged sessions —
    exercises, sets, reps, weights) is visible to *only themselves*. The
    Log Workout page also locks to logging for themselves.
  - The **admin** (whoever's name matches the `ADMIN_USER` env var,
    default `Kiran` — assigned automatically the moment they register)
    can view and edit *everyone's* history, and gets a "logging for" /
    "viewing" dropdown on the Log Workout and History pages instead of
    being locked to themselves.
- Passwords are hashed (PBKDF2, stdlib-only — no extra native dependency)
  with a per-user salt; nothing is stored in plaintext.

**Nothing to set up before first boot** — registration happens through the
UI itself, the first time each person opens the app. Whoever registers
under the `ADMIN_USER` name becomes admin automatically; everyone else is
a regular member by default.

If you specifically want an *additional* outer layer (e.g. this is
reachable from outside your LAN and you want one more gate before it),
HTTP Basic Auth can be added back to `nginx/nginx.conf` — ask and I can
walk through re-adding it — but it's no longer required for correct
per-user behavior, since that's enforced by the backend regardless.

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

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create an account (any name, open sign-up) | — |
| POST | `/api/auth/login` | Log in | — |
| POST | `/api/auth/logout` | Log out | — |
| GET | `/api/auth/me` | Who's currently logged in | login |
| GET | `/api/users` | List all users (names/roles) — powers the Users directory | login |
| GET | `/api/exercises` | List known exercises | login |
| POST | `/api/exercises` | Add a new exercise to the catalog | login |
| GET | `/api/sessions?user_id=` | List sessions | login, own data only (admin: any) |
| POST | `/api/sessions` | Log a new session with its sets | login, own data (or admin) |
| GET | `/api/sessions/{id}` | Full session detail | login, own data only (admin: any) |
| PATCH | `/api/sessions/{id}` | Edit session metadata | login, own data (or admin) |
| DELETE | `/api/sessions/{id}` | Delete a session | login, own data (or admin) |
| POST | `/api/sessions/{id}/sets` | Add a set to an existing session | login, own data (or admin) |
| DELETE | `/api/sessions/{id}/sets/{set_id}` | Remove a set | login, own data (or admin) |
| GET | `/api/users/{id}/personal-bests` | Max weight per exercise — open to anyone | login |
| GET | `/api/users/{id}/profile` | Personal details (DOB, gender, height, weight, goal) | login, own data only (admin: any) |
| PATCH | `/api/users/{id}/profile` | Edit personal details | login, own data (or admin) |

Interactive docs at `/docs` are **disabled by default** — they're
auto-generated by FastAPI with no login check of their own, so leaving
them on would expose the whole API surface to anyone who finds the port.
Set `ENABLE_DOCS=true` in the backend's environment (e.g. in `.env`, then
add it to the `backend` service's `environment:` block in
`docker-compose.yml`) if you want them back for local development.

## Next ideas (not built yet)

- Editing/deleting individual sets from the History UI (API already
  supports it — `DELETE /api/sessions/{id}/sets/{set_id}`)
- Charts of weight progression over time per exercise
- Weekly/monthly volume summaries per lifter
- HTTPS on the edge nginx (e.g. via Tailscale or a Let's Encrypt sidecar)