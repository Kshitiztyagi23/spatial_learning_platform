# Adaptive Spatial Learning Platform
## Final Product and Implementation Plan

## 1. Product Vision

Build and operate an in-house adaptive spatial learning platform that gives participants one continuous browser experience across intake, spatial tasks, contextual perspective-taking, interactive LEGO transformation, feedback, and follow-up sessions.

The platform is designed as a production product rather than a collection of disconnected research tools. It owns the participant experience, orchestration logic, task execution, feedback system, data model, analytics exports, and deployment environment.

### Product goals

- Run structured learning sessions for multiple participants across repeated rounds.
- Deliver interactive spatial reasoning and 3D transformation activities.
- Provide contextual, real-time, rule-based guidance during tasks.
- Adapt task difficulty using participant performance.
- Capture complete, structured interaction data for product and learning analytics.
- Operate reliably on production servers and scale through AWS infrastructure.

### MVP scope

The MVP includes:

- Participant intake, consent, demographics, and session creation.
- Baseline spatial assessment using PTSOT-style perspective-taking and window/mental-rotation tasks.
- Contextual garden or park perspective-taking tasks.
- Interactive 3D LEGO transformation and construction task.
- Real-time feedback for the experimental condition.
- No-feedback and comparison conditions where required by the study design.
- Rule-based scoring, difficulty adaptation, and feedback tracking.
- Centralized PostgreSQL persistence and export-ready analytics data.
- Production deployment on AWS.

Machine-learning personalization is intentionally outside the MVP. The first production version uses explicit, explainable rules so task behavior can be validated and improved safely.

## 2. Product Experience

Participants should experience the platform as one seamless application. They should not need to understand which internal module is running or manually move between tools.

### Participant journey

1. Participant opens the platform and receives a session.
2. The intake flow collects consent, assent, demographics, and spatial-experience information.
3. The orchestration layer creates the participant and session records and assigns the study condition.
4. The baseline spatial assessment establishes initial performance and difficulty.
5. The participant completes the perspective-taking task with feedback behavior determined by condition.
6. The participant completes the window or mental-rotation task.
7. The participant completes the interactive LEGO transformation task when included in the assigned flow.
8. The platform provides contextual feedback during eligible tasks and records each feedback event.
9. The participant completes the session feedback step.
10. The platform closes the round, generates the next difficulty, and schedules the next session where applicable.

All transitions are controlled by the orchestration layer. Navigation state is recoverable so a paused or interrupted session can resume from the correct stage.

## 3. Technical Architecture

```text
+---------------------------------------------------------------+
|                 React + TypeScript Web App                    |
| intake | study flow | spatial tasks | LEGO 3D interface      |
+-----------------------------+---------------------------------+
                              | HTTPS / WebSocket
+-----------------------------v---------------------------------+
|                    FastAPI Application                        |
| API routing | authentication | orchestration | scoring       |
| feedback rules | difficulty adaptation | exports | audit log  |
+-----------------------------+---------------------------------+
                              |
+-----------------------------v---------------------------------+
|                         PostgreSQL                            |
| participants | sessions | stages | tasks | trials | events   |
+---------------------------------------------------------------+
                              |
+-----------------------------v---------------------------------+
|                         AWS Production                        |
| compute/server runtime | managed database | object storage   |
| HTTPS/domain | monitoring/logging | backups | deployment      |
+---------------------------------------------------------------+
```

### Application layers

**Frontend: React and TypeScript**

- Owns the participant-facing single-page experience.
- Renders intake, task instructions, response controls, feedback, and session status.
- Maintains active task state and synchronizes durable events with the backend.
- Hosts spatial task interfaces and the Three.js-based LEGO environment.
- Handles loading, error recovery, reconnection, and accessible interaction states.

**Backend: FastAPI and Python**

- Exposes versioned HTTP APIs and WebSocket connections.
- Owns participant, session, stage, condition, scoring, and progression logic.
- Validates all incoming task and event payloads.
- Coordinates task configuration and feedback decisions.
- Provides export and operational endpoints for authorized staff.

**Database: PostgreSQL**

- Stores normalized operational data and immutable event history.
- Links every participant, session, round, task, trial, response, hint, and LEGO action.
- Supports concurrent users, repeated sessions, reporting, and future analytics workloads.

**Task engine**

- Loads versioned task definitions from the backend.
- Randomizes eligible stimuli within defined constraints.
- Tracks trial timing, responses, correctness, and task-level metrics.
- Applies the same task contract across standard, contextual, and 3D activities.

**Feedback engine**

- Evaluates responses and interaction patterns against explicit rules.
- Selects feedback type, message, and timing.
- Sends eligible feedback through the active WebSocket connection.
- Records what was shown, why it was shown, and whether the participant corrected the error.

### Internal modularity

The MVP runs as one deployable product with clear internal service boundaries. The main modules are:

- Participant and identity service.
- Session and orchestration service.
- Task definition and experiment engine.
- Scoring and metrics service.
- Real-time feedback service.
- LEGO transformation service.
- Data export and administration service.

This keeps deployment manageable while allowing high-load or specialized components to be separated later without rewriting the participant flow.

## 4. Orchestration Layer

The orchestration layer is the control system for the product. It is responsible for deciding what happens next, ensuring that the participant sees the correct experience, and keeping all resulting data linked.

### Responsibilities

- Create and pseudonymize participant records.
- Create and resume sessions and monthly rounds.
- Assign and enforce experimental conditions.
- Resolve the current stage and next valid stage.
- Select task configurations and difficulty.
- Authorize feedback behavior by condition.
- Accept and validate task events.
- Persist progress transactionally.
- Recover interrupted sessions without losing state.
- Close rounds and schedule subsequent rounds.
- Make complete session data available for export and analysis.

### State machine

```text
SESSION_CREATED
      |
      v
INTAKE_CONSENT --> DEMOGRAPHICS --> SPATIAL_EXPERIENCE
                                          |
                                          v
                                 BASELINE_ASSESSMENT
                                          |
                         +----------------+----------------+
                         |                |                |
                         v                v                v
                 EXPERIMENTAL       CONTROL_TASK      CONTROL_NO_INTERVENTION
                         |                |                |
                         +----------------+----------------+
                                          v
                              PERSPECTIVE_TAKING_TASK
                                          |
                                          v
                                 WINDOW_TEST_TASK
                                          |
                                          v
                                  LEGO_BUILD_TASK
                                          |
                                          v
                                SESSION_FEEDBACK
                                          |
                                          v
                             ROUND_COMPLETE / STUDY_COMPLETE
```

The exact path is resolved from the assigned condition and study configuration. Every transition validates that the current stage is complete and that the next stage is permitted, preventing duplicate submissions or skipped activities.

### Stage record

Each stage tracks:

- Session and participant identifiers.
- Stage name and version.
- Entry and completion timestamps.
- Stage status: pending, active, complete, paused, or failed.
- Input and output metadata.
- Retry and error information.

### Condition behavior

- **Experimental:** receives adaptive feedback during eligible tasks.
- **Control 1:** completes comparable tasks without adaptive feedback.
- **Control 2:** follows the configured no-intervention path.

Condition is assigned once, stored server-side, and never trusted solely from client-provided parameters.

## 5. Task Modules

### Baseline spatial assessment

The baseline assessment establishes an initial performance profile using:

- PTSOT-style perspective-taking items.
- Window or mental-rotation items.
- Controlled stimulus randomization.
- Difficulty levels such as easy, medium, and hard.
- Trial-level response time, accuracy, and error logging.

Baseline metrics determine the initial difficulty and provide a comparison point for later rounds.

### Contextual perspective-taking task

The task places spatial reasoning questions in a familiar garden or park narrative. Each item defines:

- Narrative and visual scene.
- Reference character or viewpoint.
- Target object and spatial relationship.
- Response options.
- Correct answer and difficulty.
- Optional angular deviation or complexity metadata.

The feedback engine can identify common errors such as confusing the character's viewpoint or reversing a directional relationship.

### Window or mental-rotation task

The task presents rotated objects or window-like shapes and records:

- Stimulus identifier and orientation.
- Selected response.
- Correctness.
- Reaction time.
- Difficulty and trial number.
- Optional confidence or retry information.

### LEGO transformation task

The custom 3D module is a key product differentiator. It provides:

- Reference views of the target model.
- A Three.js-based interactive construction space.
- A controlled block palette.
- Placement, movement, rotation, and removal interactions.
- Real-time validation against the target structure.
- Accuracy, efficiency, and completion scoring.
- Feedback for errors such as incorrect height, position, orientation, or color.
- Complete build-sequence logging.

The target model is represented as structured block data rather than only an image, enabling deterministic validation and detailed analytics.

## 6. Adaptive Feedback and Difficulty

### Real-time feedback flow

1. The client sends a response or LEGO interaction event.
2. The backend validates the event against the active session and task.
3. The scoring service evaluates correctness and identifies an error category.
4. The feedback service checks condition, cooldown, and rule eligibility.
5. The backend sends a feedback event over WebSocket when appropriate.
6. The client displays the feedback without breaking the task flow.
7. The event and subsequent participant action are persisted for analysis.

### Feedback rules

Examples include:

- Incorrect perspective response: prompt the participant to imagine standing at the character's position.
- Incorrect vertical LEGO placement: direct attention to the side view and layer count.
- Incorrect horizontal position: direct attention to the front view.
- Incorrect color or block type: direct attention to the reference model.
- Correct action: provide concise positive confirmation where configured.

Feedback is explainable, condition-aware, rate-limited, and versioned. The MVP uses rule-based logic rather than opaque model output.

### Difficulty adaptation

Difficulty is adapted from recent performance using configurable thresholds. A starting policy is:

- Accuracy at or above 85 percent: increase difficulty.
- Accuracy at or below 70 percent: decrease difficulty.
- Accuracy between those thresholds: maintain difficulty.

The policy can also consider reaction time, error type, hint usage, and completion efficiency. Adaptation is stored as a decision event so every future task selection is auditable.

## 7. Data Model

### Core entities

```text
participants
  id, external_id, demographic fields, consent status, condition, created_at

sessions
  id, participant_id, round_number, status, current_stage,
  current_difficulty, started_at, ended_at

stages
  id, session_id, stage_name, stage_version, status,
  started_at, completed_at, metadata

tasks
  id, task_type, version, difficulty, definition_json, active

task_instances
  id, session_id, task_id, started_at, ended_at, status

trials
  id, task_instance_id, trial_number, stimulus_id,
  correct_response, difficulty, started_at, ended_at

responses
  id, trial_id, response_value, correct, reaction_time_ms, created_at

feedback_events
  id, session_id, task_instance_id, response_id, feedback_type,
  message, trigger_reason, shown_at, accepted, rule_version

lego_events
  id, task_instance_id, event_type, block_id, block_type,
  position_json, rotation_json, is_correct, created_at

lego_submissions
  id, task_instance_id, final_build_json, accuracy,
  efficiency_score, duration_seconds, submitted_at

adaptation_decisions
  id, session_id, source_metrics_json, previous_difficulty,
  next_difficulty, rule_version, created_at

audit_logs
  id, actor_type, actor_id, entity_type, entity_id, action,
  details_json, created_at
```

### Data principles

- Use server-generated identifiers and pseudonymous participant references.
- Keep raw events alongside derived summaries.
- Store timestamps in UTC with millisecond precision where required.
- Version task definitions, feedback rules, and adaptation policies.
- Enforce foreign keys, uniqueness constraints, and transaction boundaries.
- Make exports reproducible from persisted raw data.

## 8. API Contracts

All APIs are versioned under `/api/v1` and return consistent error structures.

### Participant and session APIs

```text
POST /api/v1/participants
  Create a participant record.

GET /api/v1/participants/{participant_id}
  Retrieve authorized participant state.

POST /api/v1/sessions
  Create a session for a participant and round.

GET /api/v1/sessions/{session_id}
  Retrieve current session state and stage.

GET /api/v1/sessions/{session_id}/next-stage
  Resolve the next permitted stage and launch metadata.

POST /api/v1/sessions/{session_id}/stages/{stage}/complete
  Complete a stage after validating its payload.
```

### Task and event APIs

```text
GET /api/v1/sessions/{session_id}/tasks/{task_type}
  Return the task configuration for the active session.

POST /api/v1/sessions/{session_id}/trials
  Record a trial response and scoring data.

POST /api/v1/sessions/{session_id}/lego/events
  Record a LEGO placement, removal, movement, or submission event.

POST /api/v1/sessions/{session_id}/lego/submit
  Validate and persist the final LEGO build.

POST /api/v1/sessions/{session_id}/feedback/acknowledge
  Record participant interaction with feedback.

WS /api/v1/sessions/{session_id}/feedback
  Deliver authorized real-time feedback and session events.
```

### Export and administration APIs

```text
GET /api/v1/exports/sessions/{session_id}?format=json|csv
  Export one session.

GET /api/v1/exports/participants/{participant_id}?format=json|csv
  Export all authorized rounds for one participant.

POST /api/v1/admin/task-definitions
  Create a versioned task definition.

GET /api/v1/admin/metrics
  Return operational and product metrics for authorized staff.
```

Example task response:

```json
{
  "session_id": "S-001",
  "stage": "perspective_taking",
  "task_type": "garden_perspective",
  "difficulty": "medium",
  "feedback_enabled": true,
  "task_version": "v1",
  "items": []
}
```

Example event response:

```json
{
  "event_id": "EV-001",
  "accepted": true,
  "correct": false,
  "feedback": {
    "shown": true,
    "type": "directional",
    "message": "Try imagining you are standing where the character is."
  },
  "next_stage": null
}
```

## 9. AWS Production Deployment

The finished product is deployed on AWS production servers and operated as a server-hosted application.

### Production components

- React frontend served through a production web server and CDN where appropriate.
- FastAPI application running on AWS compute infrastructure behind HTTPS.
- Managed PostgreSQL database using Amazon RDS or an equivalent managed PostgreSQL service.
- Object storage such as Amazon S3 for reference images, task assets, and generated exports.
- Load balancing and health checks for reliable application access.
- Secure DNS, TLS certificates, and environment-specific configuration.
- Centralized logs, metrics, alerts, backups, and database recovery procedures.

The exact AWS compute choice can be EC2, ECS, or another managed runtime based on operational requirements. The application remains container-friendly and stateless so additional instances can be added without changing participant logic.

### Deployment flow

```text
source repository
      |
      v
CI build and validation
      |
      v
container/package artifact
      |
      v
AWS staging environment
      |
      v
production approval and migration
      |
      v
AWS production servers
```

Database migrations run as a controlled release step. Secrets are supplied through secure environment configuration or AWS secret management, never committed to source control.

### Reliability and security

- HTTPS for all participant and service traffic.
- Authentication and role-based authorization for staff endpoints.
- Server-side validation of condition, session, stage, and task identifiers.
- Idempotency keys for retried event submissions.
- Rate limiting and request-size limits on public endpoints.
- Backups, health checks, structured logs, and alerting.
- Pseudonymized participant identifiers and minimum necessary personal data.
- Audit logging for administrative and state-changing actions.

## 10. Implementation Roadmap

### Phase 1: Platform and orchestration

- Initialize React, TypeScript, FastAPI, and PostgreSQL applications.
- Add environment configuration, migrations, and API versioning.
- Implement participant, session, stage, and condition models.
- Implement the state machine and resumable session flow.
- Add intake screens and the first end-to-end browser flow.

### Phase 2: Task engine and baseline assessment

- Define versioned task JSON schemas.
- Build reusable task rendering and response components.
- Add PTSOT-style and window/mental-rotation task banks.
- Implement randomization, timing, scoring, and trial persistence.
- Add summary metrics and difficulty initialization.

### Phase 3: Feedback and adaptation

- Define feedback rule schemas and rule versioning.
- Implement WebSocket session channels.
- Add condition-aware hint delivery and cooldowns.
- Record feedback display, acknowledgement, and correction behavior.
- Implement configurable difficulty adaptation.

### Phase 4: Contextual and LEGO modules

- Add garden or park perspective-taking scenarios.
- Build the Three.js LEGO scene, camera controls, palette, and placement model.
- Implement deterministic target comparison and scoring.
- Add LEGO-specific feedback and full build-event logging.

### Phase 5: Production hardening and AWS operation

- Containerize application services and configure production environments.
- Provision AWS compute, database, object storage, HTTPS, and monitoring.
- Add migrations, backups, health checks, error tracking, and deployment automation.
- Optimize database indexes and event ingestion for concurrent participants.
- Complete administrator exports and operational dashboards.

### Phase 6: Product launch and iteration

- Run end-to-end production verification with representative sessions.
- Monitor task completion, latency, errors, feedback usage, and data quality.
- Review participant and staff experience.
- Iterate on task content, feedback rules, and difficulty policies using observed data.
- Add new learning modules without changing the orchestration contract.

## 11. Success Measures

### Participant experience

- Participants can complete a session through one continuous application flow.
- Sessions resume correctly after a refresh or temporary connection loss.
- Task transitions require no manual staff intervention.
- Feedback appears at the intended moment without disrupting task interaction.

### Product and engineering

- New task types can be added through the task contract and module boundary.
- APIs remain stateless and support multiple concurrent sessions.
- Deployments are repeatable across staging and AWS production.
- Failures are observable through logs, metrics, and alerts.
- State changes and data submissions are traceable through audit records.

### Data and analytics

- Every participant, round, stage, trial, response, feedback event, and LEGO action is linked.
- Exports contain both raw interaction data and derived session summaries.
- Task, feedback, and adaptation versions are preserved for reproducibility.
- Product decisions can be informed by accuracy, reaction time, completion, engagement, and feedback-response metrics.

## 12. Final Position

This project is an end-to-end adaptive spatial learning product: a unified participant application, a state-machine-driven orchestration layer, interactive task modules, real-time feedback, structured analytics, and AWS production infrastructure. Its modular design supports reliable current operation while leaving a clear path for additional tasks, richer personalization, larger participant volumes, and future product capabilities.
