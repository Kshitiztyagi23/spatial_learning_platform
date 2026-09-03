import { beforeEach, describe, expect, it } from "vitest";
import { useSession } from "../session";

beforeEach(() => {
  useSession.getState().loadPuzzle("step-01");
});

describe("session store", () => {
  it("solves step-01 entirely through store actions", () => {
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

    useSession.getState().loadPuzzle("step-01");
    const state = useSession.getState();
    expect(state.mode).toBe("build");
    expect(state.rotation).toBe(0);
  });
});
