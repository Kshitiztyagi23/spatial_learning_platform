# Adaptive Spatial Learning Platform

A comprehensive research platform for studying spatial reasoning in middle-school students (Grades 5 & 8). Participants complete a unified sequence of spatial tasks — demographic surveys, a digital psychometric perspective-taking test (PTSOT), and an interactive 3D LEGO construction workbench — with all trials, interactions, and submissions securely stored in Neon PostgreSQL via a FastAPI backend.

---

## Quick Start (No Reinstallation Needed)

All virtual environments and dependencies are saved locally on disk. You do **not** need to install anything again.

### Option 1: 1-Click Launch (Recommended)
Double-click:
```
start_all.bat
```
This automatically launches the FastAPI backend, the Vite frontend dev server, and opens your browser at `http://127.0.0.1:5173/`.

### Option 2: Individual Launchers
- **Backend**: Double-click `start_backend.bat` (runs on `http://127.0.0.1:8000`)
- **Frontend**: Double-click `start_frontend.bat` (runs on `http://127.0.0.1:5173`)

---

## Repository Structure

```
spatial_learning_platform/
├── backend/                 # FastAPI REST API + Async SQLAlchemy + Alembic
│   ├── app/                 # Routers, Models (12 tables), Schemas, State Machine
│   ├── alembic/             # Database migration versions
│   ├── venv/                # Preserved Python virtual environment (all packages installed)
│   ├── .env                 # Database connection string (Neon PostgreSQL)
│   └── tests/               # Pytest suite
│
├── frontend/                # React 19 + TypeScript + Vite Platform Shell
│   ├── src/
│   │   ├── tasks/intake/    # Consent, Demographics (Grades 5-8), Spatial Experience
│   │   ├── tasks/ptsot/     # 12-question PTSOT perspective test with interactive dial
│   │   ├── tasks/lego/      # Three.js / R3F 3D LEGO construction workbench
│   │   ├── shell/           # Progress bar & layout
│   │   └── orchestration/   # Session context & state management
│   └── node_modules/        # Preserved npm dependencies
│
├── start_all.bat            # 1-click launcher for both servers + browser
├── start_backend.bat        # Launcher for FastAPI backend
├── start_frontend.bat       # Launcher for Vite frontend
├── ptsot-task/              # Original reference standalone task
└── lego-task/               # Original reference standalone task
```

---

## Research Workflow

1. **Consent (`/`)**: Participant enters name and checks consent.
2. **Demographics (`/demographics`)**: Grade (5–8), Section, Roll Number, Age (8–18), Gender.
3. **Spatial Experience (`/experience`)**: 3 Likert questions regarding 3D games and building block habits.
4. **PTSOT (`/ptsot`)**: Instructions, 2 practice items with feedback, 12 test questions with a 5-minute countdown timer and anti-cheat tab-switching detection. Trials are posted directly to PostgreSQL.
5. **LEGO Workbench (`/lego`)**: Interactive 3D construction canvas with 3 orthographic views (Front, Right, Top), brick tray, translation-invariant validator, and final build submission.
6. **Done (`/done`)**: Completion confirmation screen.

---

## Database & Data Persistence

- **Database**: Cloud Neon PostgreSQL.
- **Tables**: `participants`, `sessions`, `stages`, `tasks`, `task_instances`, `trials`, `responses`, `lego_events`, `lego_submissions`, `feedback_events`, `adaptation_decisions`, `audit_logs`.
- All student attempts and session histories remain permanently saved in the database even after restarting local machines.

---

## Contributors

- **Kshitiz Tyagi** — Platform architecture, research design
- **Aditya Singh** — LEGO task engine (`lego-task/`)
- **Naitik Lalchandani** — PTSOT task (`ptsot-task/`)
