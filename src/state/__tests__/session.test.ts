import { beforeEach, describe, expect, it } from "vitest";
import { useSession } from "../session";
import { derivePuzzle } from "../../core/puzzle";
import type { Puzzle } from "../../core/types";
import fixtureStep01 from "../../core/__tests__/fixtures/step-01.json";

// This is a test fixture, not a lookup into src/data/puzzles/ — the store
// tests below pin an exact solution (two bricks, one requiring a rotated
// stack) independent of whatever puzzle currently occupies product step-01.
const fixture = fixtureStep01 as Puzzle;

function loadFixture() {
  const derived = derivePuzzle(fixture);
  useSession.setState({
    derived,
    placed: [],
    remaining: { ...derived.tray },
    selectedType: null,
    rotation: 0,
    mode: "build",
    lastCheck: null,
    lastReject: null,
  });
}

beforeEach(() => {
  loadFixture();
});

describe("session store", () => {
  it("solves the fixture puzzle entirely through store actions", () => {
    const { place, selectType, rotateCW, runCheck } = useSession.getState();

    selectType("2x4");
    place({ x: 1, y: 0, z: 1 });

    selectType("2x2");
    rotateCW();
    place({ x: 1, y: 1, z: 1 });

    runCheck();

    const state = useSession.getState();
    expect(state.lastCheck?.outcome).toBe("solved");
    expect(state.remaining).toEqual({ "2x2": 0, "2x3": 0, "2x4": 0 });
    expect(state.placed).toHaveLength(2);
  });

  it("rejects an illegal placement and leaves the board untouched", () => {
    const { place, selectType } = useSession.getState();

    selectType("2x4");
    place({ x: 0, y: 0, z: 4 }); // depth 4 from z=4 runs off a 6-deep board

    const state = useSession.getState();
    expect(state.lastReject).toBe("out-of-bounds");
    expect(state.placed).toHaveLength(0);
  });

  it("clears lastCheck on the next board mutation", () => {
    const { place, selectType, runCheck } = useSession.getState();

    selectType("2x4");
    place({ x: 1, y: 0, z: 1 });
    runCheck();
    expect(useSession.getState().lastCheck).not.toBeNull();

    selectType("2x2");
    place({ x: 1, y: 1, z: 1 });
    expect(useSession.getState().lastCheck).toBeNull();
  });

  it("removeAt returns a brick to the tray", () => {
    const { place, selectType, removeAt } = useSession.getState();

    selectType("2x4");
    place({ x: 1, y: 0, z: 1 });
    expect(useSession.getState().remaining["2x4"]).toBe(0);

    removeAt({ x: 1, y: 0, z: 1 });
    expect(useSession.getState().remaining["2x4"]).toBe(1);
    expect(useSession.getState().placed).toHaveLength(0);
  });

  it("refuses to remove a brick something rests on", () => {
    const { place, selectType, rotateCW, removeAt } = useSession.getState();

    selectType("2x4");
    place({ x: 1, y: 0, z: 1 });
    selectType("2x2");
    rotateCW();
    place({ x: 1, y: 1, z: 1 });

    removeAt({ x: 1, y: 0, z: 1 });
    expect(useSession.getState().lastReject).toBe("load-bearing");
    expect(useSession.getState().placed).toHaveLength(2);
  });

  it("loadPuzzle resets mode and rotation", () => {
    const { rotateCW } = useSession.getState();
    useSession.setState({ mode: "erase" });
    rotateCW();
    expect(useSession.getState().rotation).toBe(90);

    // Loads whatever the product catalog currently has at step-01 — this
    // test only cares about the generic reset behavior, not the geometry.
    useSession.getState().loadPuzzle("step-01");
    const state = useSession.getState();
    expect(state.mode).toBe("build");
    expect(state.rotation).toBe(0);
  });
});
