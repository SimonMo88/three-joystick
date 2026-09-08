import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import getPositionInScene from '../getPositionInScene.js';
import getWorldUnitsPerPixel from '../getWorldUnitsPerPixel.js';
import { type ViewportRect } from '../getViewportRect.js';

const VIEWPORT: ViewportRect = { left: 0, top: 0, width: 1024, height: 768 };

const createCamera = (): PerspectiveCamera => {
  const camera = new PerspectiveCamera(50, 1024 / 768, 0.1, 2000);

  camera.position.set(0, 0, 5);
  camera.updateMatrixWorld();

  return camera;
};

describe('getPositionInScene', () => {
  it('places the centre of the viewport on the camera axis', () => {
    const camera = createCamera();
    const position = getPositionInScene(512, 384, camera, 15, VIEWPORT);

    expect(position.x).toBeCloseTo(0, 6);
    expect(position.y).toBeCloseTo(0, 6);
    expect(position.z).toBeCloseTo(5 - 15, 6);
  });

  it('places points at a fixed depth, not a fixed radius', () => {
    const camera = createCamera();
    const centre = getPositionInScene(512, 384, camera, 15, VIEWPORT);
    const corner = getPositionInScene(0, 0, camera, 15, VIEWPORT);

    expect(corner.z).toBeCloseTo(centre.z, 6);
    expect(corner.distanceTo(camera.position)).toBeGreaterThan(15);
  });

  it('converts pixel distances to world distances by a single scale', () => {
    const camera = createCamera();
    const a = getPositionInScene(400, 300, camera, 15, VIEWPORT);
    const b = getPositionInScene(500, 300, camera, 15, VIEWPORT);
    const unitsPerPixel = getWorldUnitsPerPixel(camera, 15, VIEWPORT.height);

    expect(a.distanceTo(b)).toBeCloseTo(100 * unitsPerPixel, 6);
  });

  it('uses the same scale on both axes', () => {
    const camera = createCamera();
    const origin = getPositionInScene(512, 384, camera, 15, VIEWPORT);
    const right = getPositionInScene(612, 384, camera, 15, VIEWPORT);
    const down = getPositionInScene(512, 484, camera, 15, VIEWPORT);

    expect(origin.distanceTo(right)).toBeCloseTo(origin.distanceTo(down), 6);
  });

  it('offsets by the viewport rect rather than the window', () => {
    const camera = createCamera();
    const inset: ViewportRect = { left: 300, top: 100, width: 400, height: 300 };
    const position = getPositionInScene(500, 250, camera, 15, inset);

    expect(position.x).toBeCloseTo(0, 6);
    expect(position.y).toBeCloseTo(0, 6);
  });

  it('follows a rotated camera', () => {
    const camera = createCamera();

    camera.position.set(20, 0, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const position = getPositionInScene(512, 384, camera, 15, VIEWPORT);

    expect(position.x).toBeCloseTo(5, 6);
    expect(position.y).toBeCloseTo(0, 6);
    expect(position.z).toBeCloseTo(0, 6);
  });

  it('maps screen y downwards to world y upwards', () => {
    const camera = createCamera();
    const top = getPositionInScene(512, 100, camera, 15, VIEWPORT);
    const bottom = getPositionInScene(512, 600, camera, 15, VIEWPORT);

    expect(top.y).toBeGreaterThan(bottom.y);
  });

  it('refreshes a stale camera matrix before unprojecting', () => {
    const camera = createCamera();

    /**
     * Move the camera without touching its matrices, the way an app can
     * before the first render, and check the result reflects the new
     * position rather than the stale one.
     */
    camera.position.set(0, 50, 5);

    const position = getPositionInScene(512, 384, camera, 15, VIEWPORT);

    expect(position).toBeInstanceOf(Vector3);
    expect(position.y).toBeCloseTo(50, 6);
  });
});
