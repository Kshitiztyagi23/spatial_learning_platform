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
| `AI_PROVIDER` | Optional. `anthropic` (Claude) or `openai` (any OpenAI-compatible API: OpenAI, Gemini, Groq, OpenRouter, a local Ollama...). |
| `AI_API_KEY` | Optional. Key for that provider. Without a configured provider, hints use the fixed rule text. |
| `AI_MODEL` | Optional. Model name (Claude default: `claude-opus-5-5`; required for `openai`). |
| `AI_BASE_URL` | Optional, `openai` only. The service's API URL; examples in `backend/.env.example`. |

### Online demo (free, Render)
`render.yaml` deploys the whole platform as **one free Render web service**: it builds the React app and the backend serves it, so students use `/` and researchers use `/admin` on the same link.
1. On [render.com](https://render.com), sign in with GitHub → **New → Blueprint** → pick this repository.
2. When asked, set `DATABASE_URL` (the Neon connection string) and `ADMIN_PASSCODE` (share it with demo viewers).
3. Free services sleep after 15 minutes idle (the next visit then waits ~1 minute). To keep it awake, add a free uptime monitor (e.g. UptimeRobot) pinging `https://<your-app>.onrender.com/health` every 10 minutes.

---

## Repository Structure

```
spatial_learning_platform/
├── backend/                     # FastAPI + async SQLAlchemy + Alembic
│   ├── app/api/v1/              # participants, sessions, stages, trials, lego, admin
│   ├── app/models/              # 13 tables incl. study_protocols
│   ├── app/services/            # Study design, rounds, scoring, feedback rules, AI phrasing
│   ├── alembic/                 # Database migrations
│   └── tests/                   # Pytest suite
│
├── frontend/                    # React 19 + TypeScript + Vite
│   ├── src/tasks/intake/        # Consent, Demographics, Spatial Experience, returning-student code entry
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

## Study Design

The study compares how much students' spatial thinking improves across three groups:

| Group | Recommended use |
|---|---|
| **AI feedback** (`experimental`) | Training tasks (park perspective test and LEGO) with AI hints |
| **Tasks, no feedback** (`control`) | The same training tasks, no hints |
| **Tests only** (`natural_control`) | Only the standard tests; no training tasks |

**How a study runs:**

1. **Session 1, every student:** intake and the PTSOT pre-test. No groups exist yet and nobody gets hints. Each student gets a 6-character code (e.g. `K7Q2XM`) at the end.
2. **Assign groups (researcher):** in the admin console, press **Assign groups now**. Everyone who finished session 1 is split into the three groups in exactly the saved percentages. A student's group is permanent, and the assignment is recorded in the audit log.
3. **Sessions 2 onward:** students choose "Continue with your code", confirm their first name, and do their group's plan for that session, with or without hints. Students who return before being assigned are told their session isn't ready yet. The final session is the post-test.

**What each session contains is set in the admin console's session schedule:** one row for session 1 (shared by everyone), then for each group, which stages run in each later session and which tasks give hints. It starts from this recommended design:

| | Session 1 (pre-test) | Middle sessions | Final session (post-test) |
|---|---|---|---|
| Everyone | intake → PTSOT → window test | | |
| AI feedback | | park → LEGO, with hints | PTSOT → window test |
| Tasks, no feedback | | park → LEGO, no hints | PTSOT → window test |
| Tests only | | (skipped) | PTSOT → window test |

**Session running now:** on study days, choose in the admin console which session the class is doing (or "Any" to let students continue at their own pace). With a session chosen, only students due for it can start, new students can only join on session 1, and unfinished sessions can always be finished. An optional label (e.g. "Session 2 - 15 Oct - School A") is saved on every session started while it's set and appears as `session_label` in every export, next to `round_number`.

A later session with nothing ticked is skipped by that group. Each session's stages and hint settings are fixed when it starts, so editing the schedule only affects sessions that start afterwards. Exports label every row, including the session-1 pre-test, with the student's assigned group. The rules live in `backend/app/services/study_design.py`, which also explains how to add a new stage.

### Stages

1. **Consent (`/`)**: Participant enters name and gives consent.
2. **Demographics (`/demographics`)**: Grade, section, roll number, age, gender. Always on in round 1, because that's where the participant and session are created.
3. **Spatial Experience (`/experience`)**: Likert questions on 3D games and building-block habits.
4. **PTSOT (`/ptsot`)**: Instructions, 2 practice items with feedback, then the configured test questions under a countdown timer, with tab-switch detection. No hints for any group: it's the measure.
5. **Window Test (`/window-test`)**: mental-rotation questions from an easy (house) and a hard (window grid) set, 12 each; the student picks which of four rotated pictures matches. Researchers choose the questions, an optional time limit and shuffling in the admin console. The answer key lives only on the server (`backend/app/services/window_test.py`).
6. **Spatial Perspective Taking (`/perspective`)**: Park scenes shown from several viewpoints; "where would X be?" direction questions.
7. **LEGO Workbench (`/lego`)**: Rebuild a solid from its Front, Right, and Top views using a counted brick tray; only the puzzles selected in the protocol are offered, within the protocol's time limit. Every placement, removal, check, and rejected move is logged, and the submission is scored (accuracy = puzzles solved / offered, efficiency = solves / Check presses).
8. **Done (`/done`)**: Completion screen, showing the student's code when more sessions follow.

Refreshing the page resumes the session at the stage the server has on record. A new tab or browser starts a fresh participant.

### Feedback (where the schedule turns hints on)

**Rules decide what to say, an AI model decides how to say it.** The rule engine (`backend/app/services/feedback_rules.py`) works out what the student got wrong and picks a fixed hint. The AI model (`backend/app/services/ai_feedback.py`) rewrites that hint as one short, child-friendly sentence for the exact situation, e.g. naming the objects in the park question. Any provider works: Claude, or any OpenAI-compatible API (see the `AI_*` settings). The fixed hint is shown instead whenever no provider is configured, the call takes over 6 seconds, the model declines or errors, or its sentence breaks the writing rules (over 14 words, exclamation marks, praise). The model only receives task context: never names, demographics, or the correct answer.

Every hint is logged to `feedback_events` with the rule version, whether AI or the rule wrote it (`generated_by`), the original rule text, and whether the student then fixed the error.

- **LEGO:** every student sees which views match after Check. Experimental students also get a hint after each failed Check, getting more specific each time: what kind of error it is (e.g. "Look at the side view. Count the layers."), then where to look. Hints never name a brick. A 3-second cooldown stops repeated Checks from flooding hints.
- **Perspective:** after a wrong answer, one hint ("Imagine standing where the character is, facing the same way.") and a chance to change the answer. The answer given before the hint is what's recorded as the trial response. Whether the student then corrected it is stored on the feedback event.
- Hints are switched off for control participants, and LEGO hints can also be switched off in the protocol.

---

## Admin Console (`/admin`)

Protected by `ADMIN_PASSCODE`. Every admin API call requires a signed token, which expires after 8 hours.

- **Protocol**: set the group percentages and number of sessions; **assign groups** after session 1; edit the session schedule (what everyone does in session 1, and what each group does in each later session, with or without hints); see which AI provider is active; pick PTSOT questions, perspective scenarios and LEGO puzzles; set time limits.
- **Live Sessions**: every session with the student's code, group, session number, and current stage.
- **Data Exports**: CSV downloads of participants, PTSOT trials, perspective trials, LEGO events, LEGO submissions, and feedback events. Every activity row includes `participant_id`, `condition` and `round_number`, ready for pre/post comparisons by group.

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

Tests run on a throwaway in-memory SQLite database by default, including an end-to-end run of a full participant session and every export, so they never touch the study database. To check Postgres-specific behaviour, set `TEST_DATABASE_URL` to a **separate** database (a free Neon branch works), migrated once with `set DATABASE_URL=<test url>` then `alembic upgrade head`.

---

## Contributors

- **Kshitiz Tyagi** — Platform architecture, research design, admin console
- **Aditya Singh** — LEGO task engine
- **Naitik Lalchandani** — PTSOT task
- **Harshada Rajhans** — Spatial perspective-taking test
