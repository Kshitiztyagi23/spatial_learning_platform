"""The study design: sessions, groups, and what each group does when.

Flow
  session 1     every student, no group yet: intake and the pre-test (PTSOT).
                Each student gets a code to come back with.
  assignment    a researcher presses "Assign groups" in the admin console;
                everyone who finished session 1 is split into the groups by
                the protocol's percentages. The group is saved for good.
  sessions 2+   students enter their code and follow their group's plan,
                including whether tasks give hints. The final session is the
                post-test.

Groups (recommended use; the admin console's schedule decides the details)
  experimental     training tasks with AI feedback
  control          the same training tasks, no feedback
  natural_control  standard tests only, no training tasks

Schedule shape (edited in the admin console):
  {"session_1": {"stages": [...], "feedback": []},
   "groups": {group: [{"stages": [...], "feedback": [...]}, ...one per session 2..N]}}
A later session with no stages is skipped by that group.

Adding a new stage (e.g. the window test): add it to DEFAULT_STAGES in
models/protocol.py, STAGE_ROUTES in the frontend and SCHEDULE_STAGES in the
admin ScheduleEditor; add it to TEST_STAGES / TRAINING_STAGES below if the
recommended design should use it, and to FEEDBACK_STAGES if it gives hints.
"""
import random
import secrets

from app.models.protocol import DEFAULT_CONDITION_SPLIT, DEFAULT_STAGES, DEFAULT_TOTAL_ROUNDS  # noqa: F401

CONDITIONS = ("experimental", "control", "natural_control")
UNASSIGNED = "unassigned"

INTAKE_STAGES = ["intake_consent", "demographics", "spatial_experience"]
TEST_STAGES = ["ptsot", "window_test"]
TRAINING_STAGES = ["spatial_perspective_taking", "lego"]

# Stages that can show hints (the task has a hint implementation)
FEEDBACK_STAGES = {"spatial_perspective_taking", "lego"}
# Consent and demographics create the participant, so only session 1 has them
FIRST_ROUND_ONLY = {"intake_consent", "demographics"}
SCHEDULABLE_STAGES = [s for s in DEFAULT_STAGES if s != "done"]

# No 0/O/1/I so codes read back unambiguously from a teacher's handwriting
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 6

Plan = dict          # {"stages": [...], "feedback": [...]}
Schedule = dict      # {"session_1": Plan, "groups": {group: [Plan, ...]}}


def round_type(round_number: int, total_rounds: int) -> str:
    if round_number <= 1:
        return "pre"
    if round_number >= total_rounds:
        return "post"
    return "training"


def order_stages(stages) -> list[str]:
    """Canonical order with "done" last; unknown names dropped."""
    wanted = set(stages)
    return [s for s in DEFAULT_STAGES if s in wanted and s != "done"] + ["done"]


# ---- schedule ---------------------------------------------------------------------

def _default_later_session(condition: str, round_number: int, total_rounds: int) -> Plan:
    if round_type(round_number, total_rounds) == "post":
        return {"stages": list(TEST_STAGES), "feedback": []}
    if condition == "natural_control":
        return {"stages": [], "feedback": []}
    feedback = list(TRAINING_STAGES) if condition == "experimental" else []
    return {"stages": list(TRAINING_STAGES), "feedback": feedback}


def default_schedule(total_rounds: int) -> Schedule:
    return {
        "session_1": {"stages": INTAKE_STAGES + TEST_STAGES, "feedback": []},
        "groups": {
            c: [_default_later_session(c, r, total_rounds) for r in range(2, total_rounds + 1)]
            for c in CONDITIONS
        },
    }


def _clean_plan(entry, first_session: bool) -> Plan:
    entry = entry if isinstance(entry, dict) else {}
    stages = [s for s in entry.get("stages", []) if s in SCHEDULABLE_STAGES]
    if first_session:
        stages.append("demographics")
    else:
        stages = [s for s in stages if s not in FIRST_ROUND_ONLY]
    stages = order_stages(stages)[:-1]
    # No hints in session 1: nobody has a group yet
    feedback = [] if first_session else [s for s in entry.get("feedback", []) if s in FEEDBACK_STAGES and s in stages]
    return {"stages": stages, "feedback": order_stages(feedback)[:-1]}


def normalize_schedule(raw, total_rounds: int) -> Schedule:
    """Make any stored or submitted schedule valid: one plan per later
    session for every group (missing ones filled from the recommended
    design), known stages only, canonical order, demographics always in
    session 1, intake stages only in session 1, and hints only on stages that
    run and support them."""
    fallback = default_schedule(total_rounds)
    raw = raw if isinstance(raw, dict) else {}
    groups_raw = raw.get("groups") if isinstance(raw.get("groups"), dict) else {}
    out_groups = {}
    for c in CONDITIONS:
        plans = groups_raw.get(c) if isinstance(groups_raw.get(c), list) else []
        out_groups[c] = [
            _clean_plan(plans[i] if i < len(plans) else fallback["groups"][c][i], first_session=False)
            for i in range(total_rounds - 1)
        ]
    return {
        "session_1": _clean_plan(raw.get("session_1", fallback["session_1"]), first_session=True),
        "groups": out_groups,
    }


def round_plan(schedule: Schedule, condition: str, round_number: int) -> Plan:
    """{"stages": [..., "done"], "feedback": [...]} for one session, or
    stages == [] when this participant has nothing to do in that session."""
    if round_number == 1:
        entry = schedule["session_1"]
    else:
        plans = schedule["groups"].get(condition) or []
        idx = round_number - 2
        entry = plans[idx] if 0 <= idx < len(plans) else {"stages": [], "feedback": []}
    if not entry["stages"]:
        return {"stages": [], "feedback": []}
    return {"stages": order_stages(entry["stages"]), "feedback": list(entry["feedback"])}


def first_round_stages(schedule: Schedule) -> list[str]:
    return order_stages(schedule["session_1"]["stages"])


# ---- progress through the study -------------------------------------------------------

def participant_progress(condition: str, last_completed_round: int, schedule: Schedule) -> tuple[str, int | None]:
    """("ready", round) when the participant has a session to do,
    ("waiting", None) when they finished session 1 but have no group yet,
    ("complete", None) when there's nothing left."""
    if last_completed_round == 0:
        return "ready", 1
    if condition not in CONDITIONS:
        return "waiting", None
    plans = schedule["groups"].get(condition) or []
    for r in range(max(2, last_completed_round + 1), len(plans) + 2):
        if plans[r - 2]["stages"]:
            return "ready", r
    return "complete", None


def has_more_rounds(condition: str, round_number: int, schedule: Schedule) -> bool:
    """After finishing `round_number`, will this participant come back?"""
    if condition not in CONDITIONS:
        # Not assigned yet: they return once a group is given, if any group
        # has a later session at all
        return any(p["stages"] for plans in schedule["groups"].values() for p in plans)
    return participant_progress(condition, round_number, schedule)[0] == "ready"


# ---- group assignment ------------------------------------------------------------------

def allocate_groups(participant_ids: list[str], split: dict[str, int], rng: random.Random | None = None) -> dict[str, str]:
    """Split participants into groups in exactly the protocol's proportions
    (largest-remainder rounding), in random order."""
    ids = list(participant_ids)
    (rng or random).shuffle(ids)
    weights = {c: max(0, int(split.get(c, 0))) for c in CONDITIONS}
    total_weight = sum(weights.values()) or 1
    exact = {c: len(ids) * w / total_weight for c, w in weights.items()}
    counts = {c: int(v) for c, v in exact.items()}
    leftover = len(ids) - sum(counts.values())
    for c in sorted(CONDITIONS, key=lambda c: exact[c] - counts[c], reverse=True)[:leftover]:
        counts[c] += 1
    out, i = {}, 0
    for c in CONDITIONS:
        for pid in ids[i:i + counts[c]]:
            out[pid] = c
        i += counts[c]
    return out


# ---- participant codes -------------------------------------------------------------------

def generate_participant_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


def normalize_code(code: str) -> str:
    """Accept lowercase, spaces and dashes when a student types their code."""
    return "".join(ch for ch in code.upper() if ch.isalnum())
