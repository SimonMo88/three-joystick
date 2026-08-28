import { Mesh, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RotationJoystickControls } from '../RotationJoystickControls.js';
import {
  createCamera,
  createCanvas,
  createScene,
  pointerDown,
  pointerMove,
  pointerUp,
} from './helpers.js';

const activeControls: RotationJoystickControls[] = [];

const createControls = () => {
  const camera = createCamera();
  const scene = createScene();
  const canvas = createCanvas();
  const target = new Mesh();
  const controls = new RotationJoystickControls(camera, scene, target, {
    domElement: canvas,
  });

  activeControls.push(controls);

  return { camera, scene, canvas, target, controls };
};

afterEach(() => {
  while (activeControls.length) {
    activeControls.pop()?.destroy();
  }
  document.body.innerHTML = '';
});

describe('RotationJoystickControls', () => {
  it('leaves the target alone while the joystick is idle', () => {
    const { target, controls } = createControls();
    const before = target.quaternion.clone();

    controls.update();

    expect(target.quaternion.equals(before)).toBe(true);
  });

  it('rotates the target while the joystick is held', () => {
    const { target, canvas, controls } = createControls();

    pointerDown(canvas, 500, 400);
    pointerMove(550, 400);
    controls.update();

    /**
     * A purely horizontal drag turns the target about the horizontal
     * movement axis, which defaults to Y.
     */
    const euler = target.rotation;

    expect(euler.y).toBeCloseTo(50 * controls.deltaScale, 6);
    expect(euler.x).toBeCloseTo(0, 6);
  });

  it('respects a custom rotation axis', () => {
    const { target, canvas, controls } = createControls();

    controls.horizontalMovementAxis = new Vector3(0, 0, 1);

    pointerDown(canvas, 500, 400);
    pointerMove(550, 400);
    controls.update();

    expect(target.rotation.z).toBeCloseTo(50 * controls.deltaScale, 6);
  });

  it('caps rotation speed at the edge of the touch zone', () => {
    const { target, canvas, controls } = createControls();

    pointerDown(canvas, 500, 400);
    pointerMove(520, 400);
    pointerMove(100000, 400);
    controls.update();

    /**
     * Regression guard: displacement used to be unbounded, so dragging
     * far outside the base spun the target arbitrarily fast while the
     * ball sat still on the perimeter.
     */
    expect(target.rotation.y).toBeCloseTo(
      controls.joystickTouchZone * controls.deltaScale,
      6,
    );
  });

  it('accumulates rotation across frames', () => {
    const { target, canvas, controls } = createControls();

    pointerDown(canvas, 500, 400);
    pointerMove(550, 400);
    controls.update();
    controls.update();
    controls.update();

    expect(target.rotation.y).toBeCloseTo(3 * 50 * controls.deltaScale, 6);
  });

  it('stops rotating once the pointer is released', () => {
    const { target, canvas, controls } = createControls();

    pointerDown(canvas, 500, 400);
    pointerMove(550, 400);
    controls.update();
    pointerUp(550, 400);

    const afterRelease = target.quaternion.clone();

    controls.update();
    controls.update();

    expect(target.quaternion.equals(afterRelease)).toBe(true);
  });

  it('still reports movement to a callback passed to update', () => {
    const { canvas, controls } = createControls();
    const callback = vi.fn();

    pointerDown(canvas, 500, 400);
    pointerMove(550, 380);
    controls.update(callback);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ moveX: 50, moveY: -20 }),
    );
  });
});
