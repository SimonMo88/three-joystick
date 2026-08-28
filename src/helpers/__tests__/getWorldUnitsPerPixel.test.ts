import { MathUtils, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import getWorldUnitsPerPixel from '../getWorldUnitsPerPixel.js';

describe('getWorldUnitsPerPixel', () => {
  it('matches the visible height of the frustum at that distance', () => {
    const camera = new PerspectiveCamera(50, 4 / 3, 0.1, 2000);
    const visibleHeight = 2 * 15 * Math.tan(MathUtils.degToRad(25));

    expect(getWorldUnitsPerPixel(camera, 15, 768)).toBeCloseTo(
      visibleHeight / 768,
      9,
    );
  });

  it('scales linearly with distance', () => {
    const camera = new PerspectiveCamera(50, 4 / 3, 0.1, 2000);
    const near = getWorldUnitsPerPixel(camera, 10, 768);
    const far = getWorldUnitsPerPixel(camera, 30, 768);

    expect(far).toBeCloseTo(near * 3, 9);
  });

  it('accounts for camera zoom', () => {
    const camera = new PerspectiveCamera(50, 4 / 3, 0.1, 2000);
    const unzoomed = getWorldUnitsPerPixel(camera, 15, 768);

    camera.zoom = 2;
    camera.updateProjectionMatrix();

    expect(getWorldUnitsPerPixel(camera, 15, 768)).toBeCloseTo(unzoomed / 2, 9);
  });

  it('returns zero rather than infinity for an unmeasured viewport', () => {
    const camera = new PerspectiveCamera(50, 4 / 3, 0.1, 2000);

    expect(getWorldUnitsPerPixel(camera, 15, 0)).toBe(0);
  });
});
