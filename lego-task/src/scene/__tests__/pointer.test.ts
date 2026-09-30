import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { getRaycastCandidate } from "../pointer";
import type { Placement } from "../../core/types";

function screenPointFor(camera: THREE.Camera, world: THREE.Vector3, rect: DOMRect) {
  const ndc = world.clone().project(camera);
  return {
    clientX: rect.left + ((ndc.x + 1) / 2) * rect.width,
    clientY: rect.top + ((1 - ndc.y) / 2) * rect.height,
  };
}

// Regression test for: hovering an empty column right next to a placed brick
// resolved to y=1 with nothing under it ("that brick needs something under
// it"), because the ray grazed the neighboring brick's raised top face
// instead of the plate. Build mode now raycasts the plate only and reads
// stack height from `placed`, so a brick's mesh can no longer redirect a
// hover meant for open ground.
describe("getRaycastCandidate (build mode)", () => {
  const width = 4;
  const depth = 3;
  const centerX = (width - 1) / 2;
  const centerZ = (depth - 1) / 2;

  const plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth));
  plateMesh.rotation.x = -Math.PI / 2;
  plateMesh.position.set(centerX, 0, centerZ);
  plateMesh.name = "plate";
  plateMesh.updateMatrixWorld(true);

  // Angled like the app's default 3D view, not straight down, so this covers
  // the shallow-angle case that triggered the bug.
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(centerX, 10, centerZ - 5);
  camera.lookAt(centerX, 0, centerZ);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const rect = { left: 0, top: 0, width: 200, height: 200 } as DOMRect;

  // One 2x3 brick occupying columns x:0-1, z:0-2. Columns x:2-3 are empty,
  // matching the reported "2 empty columns beside the placed bricks" shape.
  const placed: Placement[] = [
    { instanceId: "blue", typeId: "2x3-blue", rotation: 0, origin: { x: 0, y: 0, z: 0 } },
  ];

  // Its mesh is present in placedGroup so a test regressing to the old
  // mesh-occlusion behavior would still have something to (wrongly) hit.
  const placedGroup = new THREE.Group();
  const brickMesh = new THREE.Mesh(new THREE.BoxGeometry(2 - 0.03, 0.97, 3 - 0.03));
  brickMesh.position.set(0.5, 0.5, 1);
  placedGroup.add(brickMesh);
  placedGroup.updateMatrixWorld(true);

  it("hovering an empty column beside a placed brick lands on the ground, not floating", () => {
    const { clientX, clientY } = screenPointFor(camera, new THREE.Vector3(2, 0, 1), rect);
    const hit = getRaycastCandidate(clientX, clientY, rect, camera, plateMesh, placedGroup, "build", placed);
    expect(hit).toEqual({ type: "plate", cell: { x: 2, y: 0, z: 1 } });
  });

  it("hovering an occupied column stacks on top of the existing brick", () => {
    const { clientX, clientY } = screenPointFor(camera, new THREE.Vector3(0, 0, 1), rect);
    const hit = getRaycastCandidate(clientX, clientY, rect, camera, plateMesh, placedGroup, "build", placed);
    expect(hit).toEqual({ type: "plate", cell: { x: 0, y: 1, z: 1 } });
  });
});
