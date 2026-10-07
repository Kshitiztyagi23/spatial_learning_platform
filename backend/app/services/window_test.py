"""Window (mental rotation) test: question ids and the answer key.

Questions come from the two Google Forms ("Window Test" = easy set,
"Window Test (Hard) Intro" = hard set), 12 each. Images and prompts live in
frontend/src/tasks/window/windowData.ts; the answer key stays here, on the
server, so it never reaches the browser.

ANSWER KEY: set each value to "A", "B", "C" or "D". Until a question has an
answer, responses to it are recorded but not scored. Exports always re-score
against this table, so answers recorded before the key was filled in are
scored once it is.
"""

WINDOW_ANSWER_KEY: dict[str, str | None] = {
    "easy-01": None,
    "easy-02": None,
    "easy-03": None,
    "easy-04": None,
    "easy-05": None,
    "easy-06": None,
    "easy-07": None,
    "easy-08": None,
    "easy-09": None,
    "easy-10": None,
    "easy-11": None,
    "easy-12": None,
    "hard-01": None,
    "hard-02": None,
    "hard-03": None,
    "hard-04": None,
    "hard-05": None,
    "hard-06": None,
    "hard-07": None,
    "hard-08": None,
    "hard-09": None,
    "hard-10": None,
    "hard-11": None,
    "hard-12": None,}

WINDOW_QUESTION_IDS = list(WINDOW_ANSWER_KEY)

DEFAULT_WINDOW_CONFIG = {
    "selected_questions": list(WINDOW_QUESTION_IDS),
    "time_limit_seconds": 0,   # 0 = untimed
    "shuffle": False,
}


def window_correct_answer(question_id: str | None) -> str | None:
    return WINDOW_ANSWER_KEY.get(question_id or "")
