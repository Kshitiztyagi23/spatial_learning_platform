import { describe, expect, it } from "vitest";
import { canPlace, canRemove } from "../placement";
import type { BoardSize, Placement, PieceTypeId } from "../types";

const board: BoardSize = { width: 6, depth: 6, height: 5 };
const fullTray = { "2x2-red": 5, "2x3-blue": 5, "2x4-yellow": 5 } as Record<PieceTypeId, number>;

describe("canPlace", () => {
  it("rejects a brick straddling the board edge", () => {
    const result = canPlace([], board, fullTray, "2x3-blue", 0, { x: 0, y: 0, z: 5 });
    expect(result).toEqual({ ok: false, reason: "out-of-bounds" });
  });

  it("rejects overlap with an existing brick", () => {
    const placed: Placement[] = [
      { instanceId: "a", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 0 } },
    ];
    const result = canPlace(placed, board, fullTray, "2x2-red", 0, { x: 1, y: 0, z: 1 });
    expect(result).toEqual({ ok: false, reason: "overlap" });
  });

  it("rejects a brick with one cell over a hole", () => {
    const placed: Placement[] = [
      { instanceId: "a", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 0 } },
    ];
    // 2x3 at y=1 spans x:0-1, z:0-2 — only x:0-1,z:0-1 is supported by "a"; z=2 is a hole.
    const result = canPlace(placed, board, fullTray, "2x3-blue", 0, { x: 0, y: 1, z: 0 });
    expect(result).toEqual({ ok: false, reason: "unsupported" });
  });

  it("rejects placing with tray count 0 even when the space is legal", () => {
    const emptyTray = { "2x2-red": 0, "2x3-blue": 5, "2x4-yellow": 5 } as Record<PieceTypeId, number>;
    const result = canPlace([], board, emptyTray, "2x2-red", 0, { x: 0, y: 0, z: 0 });
    expect(result).toEqual({ ok: false, reason: "none-left" });
  });

  it("accepts a legal placement resting on the plate", () => {
    const result = canPlace([], board, fullTray, "2x4-yellow", 0, { x: 0, y: 0, z: 0 });
    expect(result).toEqual({ ok: true });
  });

  it("accepts a legal placement fully supported by another brick", () => {
    const placed: Placement[] = [
      { instanceId: "a", typeId: "2x4-yellow", rotation: 0, origin: { x: 0, y: 0, z: 0 } },
    ];
    const result = canPlace(placed, board, fullTray, "2x2-red", 0, { x: 0, y: 1, z: 0 });
    expect(result).toEqual({ ok: true });
  });

  it("checks failures in order: none-left before out-of-bounds", () => {
    const emptyTray = { "2x2-red": 0, "2x3-blue": 5, "2x4-yellow": 5 } as Record<PieceTypeId, number>;
    const result = canPlace([], board, emptyTray, "2x2-red", 0, { x: 100, y: 0, z: 100 });
    expect(result).toEqual({ ok: false, reason: "none-left" });
  });
});

describe("canRemove", () => {
  it("rejects removing a brick on the plate that another brick rests on", () => {
    const placed: Placement[] = [
      { instanceId: "a", typeId: "2x4-yellow", rotation: 0, origin: { x: 0, y: 0, z: 0 } },
      { instanceId: "b", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 1, z: 0 } },
    ];
    const result = canRemove(placed, "a");
    expect(result).toEqual({ ok: false, reason: "load-bearing" });
  });

  it("allows removing the top brick", () => {
    const placed: Placement[] = [
      { instanceId: "a", typeId: "2x4-yellow", rotation: 0, origin: { x: 0, y: 0, z: 0 } },
      { instanceId: "b", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 1, z: 0 } },
    ];
    const result = canRemove(placed, "b");
    expect(result).toEqual({ ok: true });
  });

  it("allows removing a brick nothing rests on", () => {
    const placed: Placement[] = [
      { instanceId: "a", typeId: "2x4-yellow", rotation: 0, origin: { x: 0, y: 0, z: 0 } },
    ];
    expect(canRemove(placed, "a")).toEqual({ ok: true });
  });
});
