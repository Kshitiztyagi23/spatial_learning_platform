"""Park perspective task data, read from the file the frontend uses
(frontend/src/tasks/perspective/scenarios.json), so questions and correct
answers have one source. Stimulus ids look like "scenario_1_q_4"."""
import json
import re
from functools import lru_cache
from pathlib import Path

_FRONTEND = Path(__file__).resolve().parents[3] / "frontend"
SCENARIOS_FILE = _FRONTEND / "src" / "tasks" / "perspective" / "scenarios.json"
PHOTO_DIR = _FRONTEND / "public" / "perspective" / "templates"

DIRECTIONS = ("Right", "Left", "Front", "Behind")
OPPOSITE = {"Right": "Left", "Left": "Right", "Front": "Behind", "Behind": "Front"}
_STIMULUS = re.compile(r"^scenario_(\d+)_q_(\d+)$")


@lru_cache(maxsize=1)
def load_scenarios() -> dict[int, dict]:
    return {s["id"]: s for s in json.loads(SCENARIOS_FILE.read_text(encoding="utf-8"))}


def get_question(stimulus_id: str) -> tuple[dict, dict] | None:
    """(scenario, question) for a stimulus id, or None."""
    match = _STIMULUS.match(stimulus_id or "")
    if not match:
        return None
    scenario = load_scenarios().get(int(match.group(1)))
    if not scenario:
        return None
    number = int(match.group(2))
    question = next((q for q in scenario["questions"] if q["questionNumber"] == number), None)
    return (scenario, question) if question else None


def answer_relation(answer: str, correct: str) -> str:
    """correct | opposite (left/right or front/behind reversed) | adjacent."""
    if answer == correct:
        return "correct"
    return "opposite" if OPPOSITE.get(correct) == answer else "adjacent"


def scenario_photos(scenario_id: int) -> list[Path]:
    """The scenario's real photos (JPEGs). Placeholder SVGs don't count."""
    folder = PHOTO_DIR / f"scenario_{scenario_id}"
    return sorted(folder.glob("*.jpg")) if folder.is_dir() else []
