"""Server-side LEGO checking: a Python port of frontend/src/tasks/lego/core
(geometry.ts, projection.ts, check.ts, diagnose.ts). The browser keeps its
own copy for instant feedback; this one is the source of truth for scores
and gives the AI tutor the real build.

Keep the two in step: tests/test_lego_engine.py compares this module with
results produced by the TypeScript engine (tests/fixtures/lego_ts_golden.json).

Coordinates (spec §2): x right, y up, z toward the viewer. A view key is
"a,b": front=(x,y), right=(z,y), top=(x,z); the nearest brick along the
camera's axis gives each view cell its colour.
"""
import json
from functools import lru_cache
from pathlib import Path

PUZZLE_DIR = Path(__file__).resolve().parents[3] / "frontend" / "src" / "tasks" / "lego" / "data" / "puzzles"

SHAPES = {
    "1x1": (1, 1), "1x2": (1, 2), "1x3": (1, 3), "1x4": (1, 4),
    "2x2": (2, 2), "2x3": (2, 3), "2x4": (2, 4), "2x6": (2, 6),
}
VIEWS = ("front", "right", "top")

Cell = tuple[int, int, int]


# ---- puzzles ---------------------------------------------------------------------

@lru_cache(maxsize=1)
def load_puzzles() -> dict[str, dict]:
    puzzles = {}
    for path in sorted(PUZZLE_DIR.glob("*.json")):
        puzzle = json.loads(path.read_text(encoding="utf-8"))
        puzzles[puzzle["id"]] = puzzle
    return puzzles


def get_puzzle(puzzle_id: str) -> dict | None:
    return load_puzzles().get(puzzle_id)


# ---- geometry --------------------------------------------------------------------

def _shape_and_color(type_id: str) -> tuple[str, str]:
    shape, color = type_id.split("-", 1)
    if shape not in SHAPES:
        raise ValueError(f"Unknown brick type {type_id!r}")
    return shape, color


def footprint(type_id: str, rotation: int) -> tuple[int, int]:
    width, depth = SHAPES[_shape_and_color(type_id)[0]]
    return (depth, width) if rotation in (90, 270) else (width, depth)


def cells_for(placement: dict) -> list[Cell]:
    w, d = footprint(placement["typeId"], placement["rotation"])
    o = placement["origin"]
    return [(o["x"] + dx, o["y"], o["z"] + dz) for dx in range(w) for dz in range(d)]


def colored_cells(placements: list[dict]) -> list[tuple[Cell, str]]:
    return [(cell, _shape_and_color(p["typeId"])[1]) for p in placements for cell in cells_for(p)]


def _min_corner(cells: list[Cell]) -> Cell:
    if not cells:
        return (0, 0, 0)
    return (min(c[0] for c in cells), min(c[1] for c in cells), min(c[2] for c in cells))


def align(placed: list[dict], solution: list[dict]) -> tuple[list[tuple[Cell, str]], list[tuple[Cell, str]]]:
    """The child's build shifted into the target's frame (translation-invariant)."""
    placed_raw = colored_cells(placed)
    target_raw = colored_cells(solution)
    po = _min_corner([c for c, _ in placed_raw])
    to = _min_corner([c for c, _ in target_raw])
    shifted = [((c[0] - po[0] + to[0], c[1] - po[1] + to[1], c[2] - po[2] + to[2]), col) for c, col in placed_raw]
    return shifted, target_raw


# ---- projection ------------------------------------------------------------------

def view_key(view: str, cell: Cell) -> str:
    x, y, z = cell
    return {"front": f"{x},{y}", "right": f"{z},{y}", "top": f"{x},{z}"}[view]


def _depth(view: str, cell: Cell) -> int:
    return {"front": cell[2], "right": cell[0], "top": cell[1]}[view]


def project_colors(cells: list[tuple[Cell, str]]) -> dict[str, dict[str, str]]:
    views: dict[str, dict[str, str]] = {v: {} for v in VIEWS}
    nearest: dict[str, dict[str, int]] = {v: {} for v in VIEWS}
    for cell, color in cells:
        for v in VIEWS:
            key, depth = view_key(v, cell), _depth(v, cell)
            if key not in nearest[v] or depth > nearest[v][key]:
                nearest[v][key] = depth
                views[v][key] = color
    return views


def to_display_cell(view: str, key: str, board: dict) -> tuple[int, int]:
    """(row, col) in the view card's orientation, including the right-view
    z-flip (spec §2)."""
    a, b = (int(n) for n in key.split(","))
    if view == "front":
        return board["height"] - 1 - b, a
    if view == "right":
        return board["height"] - 1 - b, board["depth"] - 1 - a
    return b, a


def grid_size(view: str, board: dict) -> tuple[int, int]:
    return {
        "front": (board["height"], board["width"]),
        "right": (board["height"], board["depth"]),
        "top": (board["depth"], board["width"]),
    }[view]


# ---- check + diagnose ---------------------------------------------------------------

def _region(view: str, keys: list[str], board: dict) -> dict | None:
    if not keys:
        return None
    cells = [to_display_cell(view, k, board) for k in keys]
    return {
        "rowFrom": min(r for r, _ in cells), "rowTo": max(r for r, _ in cells),
        "colFrom": min(c for _, c in cells), "colTo": max(c for _, c in cells),
    }


def _key_diff(a: dict, b: dict) -> list[str]:
    return [k for k in a if k not in b] + [k for k in b if k not in a]


def _colour_diff(a: dict, b: dict) -> list[str]:
    return [k for k, v in a.items() if k in b and b[k] != v]


def _tally(cells: list[tuple[Cell, str]]) -> dict[str, int]:
    out: dict[str, int] = {}
    for _, color in cells:
        out[color] = out.get(color, 0) + 1
    return out


def diagnose(placed: list[dict], puzzle: dict) -> list[dict]:
    """Ranked coarsest-first. Never names a brick: at most a view and a region."""
    board = puzzle["board"]
    placed_aligned, target_raw = align(placed, puzzle["solution"])
    pv, tv = project_colors(placed_aligned), project_colors(target_raw)

    if all(pv[v].keys() == tv[v].keys() for v in VIEWS):
        if {c for c, _ in placed_aligned} != {c for c, _ in target_raw}:
            return [{"code": "hidden-brick"}]
        if puzzle.get("monochrome") or all(pv[v] == tv[v] for v in VIEWS):
            return []
        same_colours = _tally(placed_aligned) == _tally(target_raw)
        out = [{"code": "colour-swap" if same_colours else "shape-right-colour-wrong"}]
        for v in VIEWS:
            if pv[v] != tv[v]:
                keys = _colour_diff(tv[v], pv[v]) + _colour_diff(pv[v], tv[v])
                out.append({"code": "region-mismatch", "view": v, "region": _region(v, keys, board)})
        return out

    out = []
    if pv["top"].keys() != tv["top"].keys():
        out.append({"code": "footprint-wrong"})
    else:
        placed_max_y = max([0] + [c[1] for c, _ in placed_aligned])
        target_max_y = max([0] + [c[1] for c, _ in target_raw])
        if placed_max_y != target_max_y:
            out.append({"code": "height-wrong"})
    for v in VIEWS:
        if pv[v].keys() != tv[v].keys():
            out.append({"code": "region-mismatch", "view": v, "region": _region(v, _key_diff(pv[v], tv[v]), board)})
    return out


def check(placed: list[dict], puzzle: dict) -> dict:
    """outcome: solved | hidden-brick | views-mismatch | empty; per-view match;
    brick counts; ranked diagnoses (empty when solved)."""
    total = len(puzzle["solution"])
    if not placed:
        return {"outcome": "empty", "views": {v: False for v in VIEWS},
                "bricksPlaced": 0, "bricksTotal": total, "diagnoses": []}

    placed_aligned, target_raw = align(placed, puzzle["solution"])
    if puzzle.get("monochrome"):
        solved = {c for c, _ in placed_aligned} == {c for c, _ in target_raw}
        pv = {v: set(k) for v, k in project_colors(placed_aligned).items()}
        tv = {v: set(k) for v, k in project_colors(target_raw).items()}
    else:
        solved = dict(placed_aligned) == dict(target_raw)   # cell -> colour maps, as in check.ts
        pv, tv = project_colors(placed_aligned), project_colors(target_raw)

    if solved:
        return {"outcome": "solved", "views": {v: True for v in VIEWS},
                "bricksPlaced": len(placed), "bricksTotal": total, "diagnoses": []}
    views = {v: pv[v] == tv[v] for v in VIEWS}
    return {
        "outcome": "hidden-brick" if all(views.values()) else "views-mismatch",
        "views": views,
        "bricksPlaced": len(placed),
        "bricksTotal": total,
        "diagnoses": diagnose(placed, puzzle),
    }
