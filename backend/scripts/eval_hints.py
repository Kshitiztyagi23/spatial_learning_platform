"""Quality check for the AI tutor: run it on a fixed set of mistakes and
write every hint to a CSV for researchers to rate.

  LEGO: wrong builds from the engine's golden fixture (tests/fixtures).
  Park: wrong answers to scenario 1 (needs its scene map: saved in the
        database, or pass --map-file).

Each row is checked automatically for answer leaks (a park hint naming a
direction or the answer; a LEGO hint naming rows, coordinates or a move).
Uses the real AI settings in backend/.env. The free Gemini tier allows only
a few requests a minute, hence --delay.

  cd backend
  venv/Scripts/python.exe -m scripts.eval_hints --limit 50 --delay 13
"""
import argparse
import asyncio
import csv
import json
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

from app.api.v1.feedback import _area
from app.core.database import async_session_maker
from app.models.scenario_map import ScenarioMap
from app.services.ai_feedback import ai_status
from app.services.feedback_rules import lego_feedback, perspective_feedback
from app.services.lego_engine import check, get_puzzle
from app.services.lego_tutor import build_context as lego_context, safe_hint as lego_safe, tutor_hint as lego_hint
from app.services.park_scenarios import DIRECTIONS, load_scenarios
from app.services.park_tutor import build_context as park_context, safe_hint as park_safe, tutor_hint as park_hint

GOLDEN = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "lego_ts_golden.json"


def lego_cases(n: int) -> list[dict]:
    """Wrong builds, spread over the kinds of mistake (first diagnosis)."""
    by_kind: dict[str, list] = {}
    for case in json.loads(GOLDEN.read_text())["cases"]:
        diagnoses = case["expected"]["diagnoses"]
        if diagnoses:   # cases with nothing to diagnose get no hint in the app either
            by_kind.setdefault(diagnoses[0]["code"], []).append(case)
    picked, i = [], 0
    while len(picked) < n and any(i < len(v) for v in by_kind.values()):
        picked += [v[i] for v in by_kind.values() if i < len(v)]
        i += 1
    return picked[:n]


def park_cases(n: int) -> list[tuple[dict, str]]:
    questions = load_scenarios()[1]["questions"]
    return [(q, a) for q in questions for a in DIRECTIONS if a != q["correctAnswer"]][:n]


async def scene_map(path: str | None) -> str:
    if path:
        return Path(path).read_text(encoding="utf-8")
    async with async_session_maker() as db:
        scene = await db.get(ScenarioMap, 1)
    if not scene:
        raise SystemExit("No scene map for scenario 1: generate it in the admin console or pass --map-file")
    return scene.map_text


async def run_lego(case: dict) -> dict:
    puzzle = get_puzzle(case["puzzle_id"])
    result = check(case["placed"], puzzle)
    diagnoses = [{**d, "area": _area(d.get("region"), d.get("view"), puzzle["board"])} for d in result["diagnoses"]]
    rule = lego_feedback(1, diagnoses)
    context = lego_context(puzzle, {**result, "diagnoses": diagnoses, "placed": case["placed"]}, 2, [], [])
    hint = await lego_hint(context, rule)
    return {
        "task": "lego", "case": case["name"], "mistake": ",".join(d["code"] for d in diagnoses),
        "rule_hint": rule.message, "hint": hint.message, "generated_by": hint.generated_by,
        "label": hint.strategy or "", "focus": hint.focus_view or "",
        "leak": hint.generated_by == "ai" and lego_safe(hint.message) is None,
    }


async def run_park(question: dict, wrong: str, map_text: str) -> dict:
    rule = perspective_feedback(False)
    context = park_context(map_text, question, [wrong], [], [])
    hint = await park_hint(context, rule)
    return {
        "task": "park", "case": f"scenario_1_q_{question['questionNumber']}",
        "mistake": f"{wrong} (correct {question['correctAnswer']}, {context['child_answers'][0]['relation']})",
        "rule_hint": rule.message, "hint": hint.message, "generated_by": hint.generated_by,
        "label": hint.mistake_type or "", "focus": hint.strategy or "",
        "leak": hint.generated_by == "ai" and park_safe(hint.message, question["correctAnswer"]) is None,
    }


async def main(args) -> None:
    if not ai_status()["enabled"]:
        raise SystemExit("AI is not configured (AI_* settings in backend/.env)")
    n_lego = args.limit // 2
    jobs = [lambda c=c: run_lego(c) for c in lego_cases(n_lego)]
    if args.limit - n_lego:
        map_text = await scene_map(args.map_file)
        jobs += [lambda q=q, a=a: run_park(q, a, map_text) for q, a in park_cases(args.limit - n_lego)]

    out = Path(args.out or f"eval_hints_{datetime.now():%Y%m%d_%H%M}.csv")
    rows = []
    for i, job in enumerate(jobs):
        if i:
            await asyncio.sleep(args.delay)
        start = time.perf_counter()
        row = await job()
        row["ms"] = round((time.perf_counter() - start) * 1000)
        rows.append(row)
        print(f"[{i + 1}/{len(jobs)}] {row['task']} {row['case']}: [{row['generated_by']}] {row['hint']}", flush=True)

    with out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]) + ["rating_1_to_5", "rater_notes"])
        writer.writeheader()
        writer.writerows(rows)
    by = Counter((r["task"], r["generated_by"]) for r in rows)
    print(f"\nWrote {out}: {len(rows)} hints; {dict(by)}; leaks: {sum(r['leak'] for r in rows)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limit", type=int, default=50, help="number of mistakes (half LEGO, half park)")
    parser.add_argument("--delay", type=float, default=13, help="seconds between AI calls")
    parser.add_argument("--map-file", help="scenario 1 scene map as a text file (default: from the database)")
    parser.add_argument("--out", help="CSV path")
    asyncio.run(main(parser.parse_args()))
