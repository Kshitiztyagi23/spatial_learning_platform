"""Trial scoring rules, one per task type. Pure functions so exports and the
trials API always agree."""

PTSOT_TOLERANCE_DEG = 22.5


def angular_error(response: str, correct: str) -> float | None:
    """Smallest angle between two bearings in degrees (350 vs 10 -> 20)."""
    try:
        diff = abs(float(response) - float(correct)) % 360
    except (TypeError, ValueError):
        return None
    return min(diff, 360 - diff)


def score_trial(task_type: str, response: str, correct: str | None) -> bool | None:
    if correct is None:
        return None
    if task_type == "ptsot":
        err = angular_error(response, correct)
        return None if err is None else err <= PTSOT_TOLERANCE_DEG
    if task_type == "spatial_perspective_taking":
        return response.strip().lower() == correct.strip().lower()
    return None


def classify_trial_task(task_instance_type: str, correct_response: str | None) -> str:
    """Older perspective answers were filed under the PTSOT task instance;
    they are recognisable by a non-numeric correct answer ("Left", "Right")."""
    if task_instance_type == "ptsot" and correct_response is not None:
        try:
            float(correct_response)
        except ValueError:
            return "spatial_perspective_taking"
    return task_instance_type
