# Adaptive Spatial Learning Platform

A research platform for studying spatial reasoning in middle-school students (Grades 5–8). Participants complete one continuous sequence of tasks — intake surveys, a digital Perspective-Taking/Spatial Orientation Test (PTSOT), a contextual park perspective-taking test, and an interactive 3D LEGO construction workbench. Researchers configure the study and download data from a passcode-protected admin console. All trials, interactions, and submissions are stored in Neon PostgreSQL via a FastAPI backend.

---

## Quick Start

The backend virtual environment (`backend/venv`) and frontend `node_modules` are kept on disk, so no reinstall is needed.

### Option 1: 1-Click Launch (Recommended)
Double-click `start_all.bat`. It starts the FastAPI backend and the Vite dev server, then opens `http://127.0.0.1:5173/`.

### Option 2: Individual Launchers
- **Backend**: `start_backend.bat` (runs on `http://127.0.0.1:8000`)
- **Frontend**: `start_frontend.bat` (runs on `http://127.0.0.1:5173`)

### Configuration (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `CORS_ORIGINS` | Allowed frontend origins |
| `ADMIN_PASSCODE` | Researcher passcode for `/admin`. Empty disables the admin API. |
| `ADMIN_TOKEN_SECRET` | Optional. Fixed key so admin logins survive a backend restart. |

---

## Repository Structure

```
spatial_learning_platform/
├── backend/                     # FastAPI + async SQLAlchemy + Alembic
│   ├── app/api/v1/              # participants, sessions, stages, trials, lego, admin
│   ├── app/models/              # 13 tables incl. study_protocols
│   ├── app/services/            # Stage orchestration & condition assignment
│   ├── alembic/                 # Database migrations
│   └── tests/                   # Pytest suite
│
├── frontend/                    # React 19 + TypeScript + Vite
│   ├── src/tasks/intake/        # Consent, Demographics, Spatial Experience
│   ├── src/tasks/ptsot/         # 12-question PTSOT with angle-picker dial
│   ├── src/tasks/perspective/   # 8-scenario park perspective-taking test
│   ├── src/tasks/lego/          # Three.js / R3F 3D LEGO workbench (21 puzzles)
│   ├── src/admin/               # Researcher console (/admin)
│   ├── src/orchestration/       # Session context & stage routing
│   └── src/shell/               # Layout & progress bar
│
├── docs/
│   ├── PROJECT_PLAN.md          # Full product & implementation plan
│   └── lego-task/               # LEGO task spec and colour/hints design
│
├── TODO.md                      # Open work
└── start_*.bat                  # Launchers
```

---

## Participant Workflow

The stage order is controlled by the active study protocol (see Admin Console). The default sequence is:

1. **Consent (`/`)**: Participant enters name and gives consent.
2. **Demographics (`/demographics`)**: Grade, section, roll number, age, gender.
3. **Spatial Experience (`/experience`)**: Likert questions on 3D games and building-block habits.
4. **PTSOT (`/ptsot`)**: Instructions, 2 practice items with feedback, then the configured test questions under a countdown timer, with tab-switch detection.
5. **Spatial Perspective Taking (`/perspective`)**: Park scenes shown from several viewpoints; "where would X be?" direction questions.
6. **LEGO Workbench (`/lego`)**: Rebuild a solid from its Front, Right, and Top views using a counted brick tray; only the puzzles selected in the protocol are offered. Every placement, removal, check, and rejected move is logged, and the submission is scored (accuracy = puzzles solved / offered, efficiency = solves / Check presses).
7. **Done (`/done`)**: Completion screen.

Demographics is always on, because that's where the participant and session are created. Refreshing the page resumes the session at the stage the server has on record. A new tab or browser starts a fresh participant.

Each participant is randomly assigned to the `experimental` (AI feedback) or `control` condition, using the percentage set in the protocol.

---

## Admin Console (`/admin`)

Protected by `ADMIN_PASSCODE`. Every admin API call requires a signed token, which expires after 8 hours.

- **Protocol**: enable or disable stages, pick PTSOT questions, perspective scenarios and LEGO puzzles, set time limits and the AI-feedback percentage.
- **Live Sessions**: every session with participant, condition, and current stage.
- **Data Exports**: CSV downloads of participants, PTSOT trials, LEGO events, and LEGO submissions.

---

## Database

- **Database**: Neon PostgreSQL (cloud).
- **Tables**: `participants`, `sessions`, `stages`, `tasks`, `task_instances`, `trials`, `responses`, `lego_events`, `lego_submissions`, `feedback_events`, `adaptation_decisions`, `audit_logs`, `study_protocols`.
- Apply migrations with `alembic upgrade head` from `backend/`.

### Tests

```
cd backend
venv\Scripts\python -m pytest
```

Rule and orchestration tests always run. API tests write real rows, so they are skipped unless `TEST_DATABASE_URL` points at a **separate** database (a free Neon branch works). Migrate that database once with `set DATABASE_URL=<test url>` then `alembic upgrade head`.

---

## Contributors

- **Kshitiz Tyagi** — Platform architecture, research design, admin console
- **Aditya Singh** — LEGO task engine
- **Naitik Lalchandani** — PTSOT task
- **Harshada Rajhans** — Spatial perspective-taking test
