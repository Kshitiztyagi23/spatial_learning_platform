# Adaptive Spatial Learning Platform

A research platform for studying spatial reasoning in middle-school students (Grades 5 & 8). Participants complete a structured sequence of spatial tasks — a psychometric perspective-taking test followed by an interactive 3D LEGO construction challenge — while the platform records detailed interaction data for analysis.

This is a unified codebase combining work from two independent task modules, now maintained together as the foundation for the full research platform described in [`FINAL_PROJECT_PLAN.md`](./FINAL_PROJECT_PLAN.md).

---

## Repository Structure

```
spatial_learning_platform/
├── ptsot-task/              # Perspective Taking / Spatial Orientation Test (PTSOT)
├── lego-task/               # Interactive 3D LEGO construction task
├── FINAL_PROJECT_PLAN.md    # Master architecture and research platform plan
├── 00-SHARED-SPEC.md        # Original spec for the LEGO task (binding)
└── ...planning docs...
```

---

## Task Modules

### `ptsot-task/` — Perspective Taking Spatial Orientation Test

Built with **React + Vite (JavaScript)**.

A digital implementation of the standard paper-and-pencil PTSOT. Participants imagine standing at one object facing a second, then drag a circular slider to indicate the direction of a third object. Features:

- Participant intake: Name, Age, Gender, Roll No, Grade, Section
- 2 practice items with immediate visual feedback (dotted correct-angle line)
- 12 timed test questions (5-minute global timer)
- Anti-cheat: tab-switch detection, time-outside-tab logging
- Angle answers recorded as raw degree values (0–360°)

```bash
cd ptsot-task
npm install
npm run dev
```

---

### `lego-task/` — Interactive 3D LEGO Construction

Built with **React + TypeScript + Three.js (react-three-fiber) + Zustand**.

A 3D block-building task where participants reconstruct a target solid from three orthographic reference views (Front, Right, Top). Features:

- 8 brick shapes × 5 colours; physical placement rules (no overhangs, no floating)
- Real orthographic 3D view cards rendered via Three.js (not flat diagrams)
- Translation-invariant grading: correct shape placed anywhere on the board passes
- Colour-aware grading: wrong colour = wrong, even for hidden bricks
- Deterministic diagnosis engine: ranked error codes, mismatch bounding boxes
- 6 tutorial puzzles + room for Easy / Medium / Hard / Colour / Occlusion tiers
- 63 passing unit tests

```bash
cd lego-task
npm install
npm run dev
```

```bash
cd lego-task
npm test     # Vitest suite + puzzle validator
```

---

## What Is Being Built Next

Both modules currently run as standalone apps. The next step is integrating them into the full research platform:

1. **Unified application shell** — single-page flow: Intake → PTSOT → LEGO Task → Completion
2. **FastAPI + PostgreSQL backend** — replaces Google Sheets; stores all trial responses, LEGO events, and timings with full participant/session linkage
3. **Study condition gating** — Experimental group receives adaptive scaffolded feedback; Control group receives standard check results
4. **Remaining task modules** — Mental Rotation / Window Test, Contextual Garden / Park perspective tasks
5. **AWS production deployment** — RDS, ECS, HTTPS, monitoring

See [`FINAL_PROJECT_PLAN.md`](./FINAL_PROJECT_PLAN.md) for the complete architecture.

---

## Contributors

- **Kshitiz Tyagi** — platform architecture, research design
- **Aditya Singh** — LEGO task engine (`lego-task/`)
- **Naitik Lalchandani** — PTSOT task (`ptsot-task/`)
