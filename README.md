# Fitness Coach — Gym Tracker

A household fitness tracker for any number of people, with open sign-up:
workouts, body metrics, an AI-assisted nutrition/water log, badges, and
challenges between lifters. Everyone manages their own data; one
designated admin can manage everyone's.

## Stack

- **Frontend**: React + TypeScript (Vite), React Router, Axios
- **Backend**: Python + FastAPI, SQLAlchemy ORM, dependencies managed with `uv`
- **AI**: Groq (nutrition macro estimation + meal-suggestion chat)
- **Database**: SQLite (single file, persisted to a host folder via Docker)
- **Deployment**: Docker Compose, fronted by an nginx reverse proxy ("controller")

## Architecture

```
                 ┌─────────────────────────┐
  outside ──────▶│  nginx (edge, port 6060)│   <- only published port
                 └──────────┬──────────────┘
                    /api/*  │  everything else
                 ┌──────────▼─────-─┐   ┌────-───────────┐
                 │ backend          │   │ frontend       │
                 │ FastAPI :8000    │   │ nginx+SPA :80  │
                 └────────┬─────────┘   └────-───────────┘
                          │
                 ┌────────▼─────────┐        ┌──────────────┐
                 │ SQLite (volume)  │        │ Groq API     │
                 └──────────────────┘        │ (nutrition)  │
                                             └──────────────┘
```

The `nginx` service is the only container exposed outside the Docker
network — it routes `/api/*` to the backend and everything else to the
frontend's own nginx, which serves the built React app. The backend talks
to Groq's API directly for nutrition estimation/suggestions; nothing else
in the app calls out to the internet.

## Navigation

Bottom icon bar, three tabs:

- **Bests** — your personal bests (with badges above them), plus links out
  to the Users directory and Challenges
- **Log** — has its own Log/History sub-nav: logging a session, or
  browsing/editing/deleting past ones
- **Challenges** — head-to-head or group competitions between lifters

Reached via the avatar in the top-right corner (not on the bottom bar,
since they're personal rather than core actions):

- **Profile** — name, DOB, gender, height/weight, a free-text goal, and
  change-password — with its own Food/Water sub-nav leading to the
  **Nutrition** and **Water intake** trackers
- **Users directory** — browse anyone's personal bests/badges

## Data model

- **User** — created via open registration (any name, no fixed roster);
  see "Access control" below for how roles work. Also carries an optional
  **profile**: first/last name (used for avatar initials, visible to
  everyone), and private personal details — date of birth, gender,
  height, weight, and a free-text goal — visible only to that person and
  the admin.
- **Exercise** — shared catalog (e.g. "Bench Press", "Jogging"). Picked via
  a searchable combobox while logging — existing exercises are the easy,
  obvious choice; creating a new one is a deliberate, explicitly-labeled
  last resort, not something that happens from a stray typo. Matching is
  case-insensitive server-side too, so "bench press" and "Bench Press"
  always resolve to the same exercise even if someone bypasses the picker.
- **WorkoutSession** — one gym visit: user, date/time, optional title,
  duration, notes. Editable in full from History (loads back into the Log
  Workout form, including all its sets, for a real edit — not just
  metadata).
- **SetEntry** — one logged set within a session, in one of two flavors,
  chosen per exercise (a "Reps" / "Time" toggle):
  - **strength**: reps, weight, unit (kg/lb) — "3 x 8 @ 60kg"
  - **cardio**: duration, distance, unit (km/mi) — "20 min, 5.2 km jog"

  A set needs at least reps or a duration; the rest (weight, distance) is
  optional, so bodyweight sets and duration-only cardio both work fine.

  Sets are logged grouped by exercise in the UI — pick an exercise once,
  add as many sets under it as needed, then move to the next exercise —
  rather than reselecting the exercise on every single set. An in-progress
  session (exercises and sets, not the timestamp) survives navigating away
  and back, or even a page reload, via a per-user localStorage draft that's
  cleared automatically once the session actually saves; a "Clear session"
  button resets it manually at any time.

  Personal bests use whichever of these a given exercise actually has,
  in priority order: weight, then reps, then duration, then distance —
  so a weighted lift shows its best weight, a bodyweight exercise its
  best rep count, and a run its best time. Cardio and reps-only exercises
  are naturally excluded from anything weight-specific.

- **BodyMetric** — one daily body-composition reading (weight, muscle
  mass, body fat %, visceral fat, water %, protein %). One entry per
  user per date — logging again for the same date updates it rather than
  duplicating. The Metrics form pre-populates from your most recent
  entry, and each field has its own trend chart over time. Private data.

- **NutritionEntry** — a logged food entry: free-text description (e.g.
  "2 eggs and toast with butter"), with calories/protein/carbs/saturated
  fat/unsaturated fat estimated by an LLM (Groq) at creation time, then
  freely editable afterward since the AI estimate is a starting point,
  not ground truth. The same free-text box also supports **asking a
  nutrition question** ("suggest me low-calorie high-protein South Indian
  food") via a separate "Ask AI" action — the answer displays inline but
  is never written to the database; the `/nutrition/ask` endpoint has no
  database dependency at all, so there's no code path that could log a
  suggestion by mistake. Private data.

- **WaterEntry** — one "I drank X ml" tap. Deliberately minimal: a big
  daily total, three quick-add buttons (250ml/500ml/1L), a small custom
  amount field, and a compact per-entry log with delete. Private data.

- **Challenge** / **ChallengeParticipant** — a time-boxed competition
  among 2+ users (head-to-head and group challenges are the same thing,
  just a different participant count). Three types, all scored live from
  existing workout data rather than stored separately:
  - **volume** — total kg lifted (weight x reps) during the window
  - **exercise** — best weight on one named exercise during the window
    (weight-only, deliberately — mixing in reps/duration/distance the way
    personal-bests' fallback does would make cross-person comparison
    meaningless)
  - **consistency** — distinct days trained during the window

  kg/lb are converted to kg internally for fair comparison. The
  leaderboard shows rank, medal emoji for top 3, and who's currently
  ahead. Anyone can create a challenge naming any participants — no
  accept/decline flow; only the creator or admin can delete one. Visible
  to everyone (social/competitive, like personal bests), unlike the
  private trackers above.

- **Badges** — eight achievements, computed live (no stored table, no
  "award" step — just a query, re-evaluated each time): First Rep, On
  Fire (3-day streak), Iron Habit (7-day streak), 50 Sessions, New PR,
  Top of the House (household's #1 lifter for an exercise), Jack of All
  Trades (10+ distinct exercises), Data Driven (first body-metrics
  entry). Streak badges check your *longest-ever* streak, not whether
  you're currently on one — a badge is a permanent achievement. Visible
  to everyone, same as personal bests.

The database schema has been migrated in place several times now (from an
early strength-only version, through adding auth, profile fields, and
several new feature tables); `backend/app/migrations.py` handles the
column-level migrations automatically on startup for existing
deployments — brand-new tables (metrics, nutrition, water, challenges,
badges) need no migration at all since `Base.metadata.create_all` picks
them up on its own. No data is lost, no manual steps needed either way.

## Running locally (development)

Backend:

```bash
cd backend
uv sync
DB_PATH=./dev.db GROQ_API_KEY=your-key uv run uvicorn app.main:app --reload
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

There's no HTTP Basic Auth in front — access control lives in the app
itself, which is what makes per-user permissions possible (nginx alone
can't tell "Sam editing his own workout" from "Sam editing Kiran's").

**How it works:**

- The whole app sits behind a login screen. Nobody sees any data — not
  even their own — until they log in.
- **Registration is open**: anyone can create an account with any name
  and password, no invite or pre-existing roster needed. Names must be
  unique (case-insensitive).
- **Login**: name + password. Sessions last 30 days (a cookie, not a
  token you need to manage). Passwords can be changed from the Profile
  page (requires the current password).
- **Permissions**:
  - Everyone can browse the Users directory and view anyone's
    **personal bests** and **badges**.
  - A regular member's **workout history** (the actual logged sessions —
    exercises, sets, reps, weights) is visible to *only themselves*. So
    are **body metrics**, **nutrition entries**, and **water intake** —
    all private, owner-and-admin-only. The Log Workout page also locks to
    logging for themselves.
  - **Challenges** are visible to everyone (they're meant to be shown
    off), but only the creator or admin can delete one.
  - The **admin** (whoever's name matches the `ADMIN_USER` env var,
    default `Kiran` — assigned automatically the moment they register)
    can view and edit *everyone's* workout history, metrics, nutrition,
    and water data, and gets a "logging for" / "viewing" dropdown on the
    Log Workout and History pages instead of being locked to themselves.
- Passwords are hashed (PBKDF2, stdlib-only — no extra native dependency)
  with a per-user salt; nothing is stored in plaintext.

**Nothing to set up before first boot** — registration happens through the
UI itself, the first time each person opens the app. Whoever registers
under the `ADMIN_USER` name becomes admin automatically; everyone else is
a regular member by default.

If you specifically want an *additional* outer layer (e.g. this is
reachable from outside your LAN and you want one more gate before it),
HTTP Basic Auth can be added back to `nginx/nginx.conf` — ask and I can
walk through re-adding it — but it's not required for correct per-user
behavior, since that's enforced by the backend regardless.

## Running with Docker Compose (production-style)

```bash
cp .env.example .env   # adjust the values below as needed
docker compose up --build -d
```

Settings overridable via `.env` (or plain shell env vars):

- `HOST_DATA_DIR` — host folder the SQLite file is persisted to. Defaults
  to `/home/kiran/data`.
- `HOST_PORT` — host port the nginx controller is published on. Defaults
  to `6060`. Avoid ports on the browser-restricted list (e.g. 6666/6667) —
  Chrome/Firefox refuse to connect to those at all.
- `ADMIN_USER` — see "Access control" above. Defaults to `Kiran`.
- `GROQ_API_KEY` / `GROQ_MODEL` — needed for the nutrition tracker
  specifically (macro estimation + "Ask AI" suggestions); everything else
  in the app works fine without them. Get a key at
  [console.groq.com](https://console.groq.com). Defaults to
  `openai/gpt-oss-120b` for the model — Groq retires models periodically
  (with fairly short notice on free/developer tiers), so if nutrition
  logging starts 404ing, check
  [Groq's deprecations page](https://console.groq.com/docs/deprecations)
  for the current recommended replacement.

Then browse to `http://<host>:6060` (or whatever `HOST_PORT` you set). Put
your existing gosulab reverse proxy in front of this stack's `nginx`
service for external (outside-LAN) access.

Data persists on the host at `HOST_DATA_DIR`, so `docker compose down` /
`up` keeps everything regardless of container rebuilds.

## API summary

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create an account (any name, open sign-up) | -- |
| POST | `/api/auth/login` | Log in | -- |
| POST | `/api/auth/logout` | Log out | -- |
| POST | `/api/auth/change-password` | Change your own password | login, self only |
| GET | `/api/auth/me` | Who's currently logged in | login |
| GET | `/api/users` | List all users (names/roles) | login |
| GET | `/api/users/{id}/personal-bests` | Best per exercise (weight/reps/time fallback) | login, open to anyone |
| GET | `/api/users/{id}/badges` | Badge progress | login, open to anyone |
| GET | `/api/users/{id}/profile` | Personal details (DOB, gender, height, weight, goal) | login, own data (or admin) |
| PATCH | `/api/users/{id}/profile` | Edit personal details | login, own data (or admin) |
| GET | `/api/exercises` | List known exercises | login |
| POST | `/api/exercises` | Add a new exercise (case-insensitive dedup) | login |
| GET | `/api/sessions?user_id=` | List sessions | login, own data (admin: any) |
| POST | `/api/sessions` | Log a new session with its sets | login, own data (or admin) |
| GET | `/api/sessions/{id}` | Full session detail | login, own data (admin: any) |
| PATCH | `/api/sessions/{id}` | Edit session metadata only | login, own data (or admin) |
| PUT | `/api/sessions/{id}` | Full edit -- replace metadata + entire set list | login, own data (or admin) |
| DELETE | `/api/sessions/{id}` | Delete a session | login, own data (or admin) |
| POST | `/api/sessions/{id}/sets` | Add a single set | login, own data (or admin) |
| DELETE | `/api/sessions/{id}/sets/{set_id}` | Remove a single set | login, own data (or admin) |
| GET | `/api/metrics/latest` | Most recent body-metrics entry | login, own data (or admin) |
| GET | `/api/metrics` | Body-metrics history | login, own data (or admin) |
| POST | `/api/metrics` | Log/upsert a body-metrics entry for a date | login, own data (or admin) |
| POST | `/api/nutrition/ask` | Ask a nutrition question -- answer only, never logged | login |
| GET | `/api/nutrition` | List nutrition entries | login, own data (or admin) |
| POST | `/api/nutrition` | Log food (AI estimates the macros) | login, own data (or admin) |
| GET | `/api/nutrition/summary?date=` | Daily macro totals | login, own data (or admin) |
| PATCH | `/api/nutrition/{id}` | Edit a nutrition entry (correct the AI's estimate) | login, own data (or admin) |
| DELETE | `/api/nutrition/{id}` | Delete a nutrition entry | login, own data (or admin) |
| GET | `/api/water` | List water entries | login, own data (or admin) |
| POST | `/api/water` | Log a water intake tap | login, own data (or admin) |
| GET | `/api/water/summary?date=` | Daily water total | login, own data (or admin) |
| DELETE | `/api/water/{id}` | Remove a water entry | login, own data (or admin) |
| GET | `/api/challenges` | List all challenges | login, open to anyone |
| POST | `/api/challenges` | Create a challenge | login |
| GET | `/api/challenges/{id}` | Challenge detail | login, open to anyone |
| GET | `/api/challenges/{id}/leaderboard` | Live-computed standings | login, open to anyone |
| DELETE | `/api/challenges/{id}` | Delete a challenge | login, creator (or admin) |

Interactive docs at `/docs` are **disabled by default** -- they're
auto-generated by FastAPI with no login check of their own, so leaving
them on would expose the whole API surface to anyone who finds the port.
Set `ENABLE_DOCS=true` in the backend's environment if you want them back
for local development.

## Next ideas (not built yet)

- Charts of weight progression over time per exercise (Metrics already
  has trend charts; workout PRs don't yet)
- Weekly/monthly volume summaries per lifter
- Challenge notifications (e.g. "you've been overtaken")
- HTTPS on the edge nginx (e.g. via Tailscale or a Let's Encrypt sidecar)