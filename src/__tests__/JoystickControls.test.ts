import {
  type CircleGeometry,
  type Mesh,
  MeshBasicMaterial,
  Quaternion,
} from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JoystickControls } from '../JoystickControls.js';
import getWorldUnitsPerPixel from '../helpers/getWorldUnitsPerPixel.js';
import {
  VIEWPORT_HEIGHT,
  createCamera,
  createCanvas,
  createScene,
  pointerCancel,
  pointerDown,
  pointerMove,
  pointerUp,
} from './helpers.js';

type JoystickMesh = Mesh<CircleGeometry, MeshBasicMaterial>;

const activeControls: JoystickControls[] = [];

const createControls = (
  options: ConstructorParameters<typeof JoystickControls>[2] = {},
) => {
  const camera = createCamera();
  const scene = createScene();
  const canvas = createCanvas();
  const controls = new JoystickControls(camera, scene, {
    domElement: canvas,
    ...options,
  });

  activeControls.push(controls);

  return { camera, scene, canvas, controls };
};

const base = (scene: { getObjectByName: (n: string) => unknown }) =>
  scene.getObjectByName('joystick-base') as JoystickMesh | undefined;
const ball = (scene: { getObjectByName: (n: string) => unknown }) =>
  scene.getObjectByName('joystick-ball') as JoystickMesh | undefined;

afterEach(() => {
  while (activeControls.length) {
    activeControls.pop()?.destroy();
  }
  document.body.innerHTML = '';
});

describe('JoystickControls', () => {
  describe('attaching', () => {
    it('does not attach until the pointer moves', () => {
      const { scene, canvas } = createControls();

      pointerDown(canvas, 500, 400);

      expect(base(scene)).toBeUndefined();
      expect(ball(scene)).toBeUndefined();

      pointerMove(520, 400);

      expect(base(scene)).toBeDefined();
      expect(ball(scene)).toBeDefined();
    });

    it('does not attach when `preventAction` returns true', () => {
      const { scene, canvas } = createControls({ preventAction: () => true });

      pointerDown(canvas, 500, 400);
      pointerMove(520, 400);

      expect(base(scene)).toBeUndefined();
    });

    it('anchors the base at the press, not at the first movement', () => {
      const { camera, scene, canvas, controls } = createControls();

      pointerDown(canvas, 500, 400);
      pointerMove(560, 400);

      /**
       * Regression guard: the base used to be planted wherever the
       * first move event landed, so the visible base and the reported
       * displacement disagreed about their origin.
       *
       * The pointer went down at x=500 and moved to x=560, so if the
       * base is anchored at the press the ball must sit exactly 60px
       * to its right.
       */
      const unitsPerPixel = getWorldUnitsPerPixel(camera, 15, VIEWPORT_HEIGHT);

      expect(controls.baseAnchorPoint.x).toBe(500);
      expect(controls.baseAnchorPoint.y).toBe(400);
      expect(base(scene)!.position.distanceTo(ball(scene)!.position)).toBeCloseTo(
        60 * unitsPerPixel,
        6,
      );
    });

    it('uses an unlit material so the joystick is visible without lights', () => {
      const { scene, canvas } = createControls();

      pointerDown(canvas, 500, 400);
      pointerMove(520, 400);

      expect(base(scene)?.material).toBeInstanceOf(MeshBasicMaterial);
      expect(base(scene)?.material.depthTest).toBe(false);
      expect(ball(scene)?.renderOrder).toBeGreaterThan(
        base(scene)?.renderOrder ?? 0,
      );
    });

    it('turns the joystick to face the camera', () => {
      const { camera, scene, canvas, controls } = createControls();

      camera.position.set(10, 4, 10);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      pointerDown(canvas, 500, 400);
      pointerMove(520, 400);
      controls.update();

      const expected = camera.getWorldQuaternion(new Quaternion());

      expect(base(scene)?.quaternion.angleTo(expected)).toBeCloseTo(0, 6);
      expect(ball(scene)?.quaternion.angleTo(expected)).toBeCloseTo(0, 6);
    });
  });

  describe('clamping', () => {
    it('draws the base at exactly the size of the touch zone', () => {
      const { camera, scene, canvas } = createControls({
        joystickTouchZone: 90,
      });

      pointerDown(canvas, 500, 400);
      pointerMove(520, 400);

      const unitsPerPixel = getWorldUnitsPerPixel(camera, 15, VIEWPORT_HEIGHT);

      expect(base(scene)?.geometry.parameters.radius).toBeCloseTo(
        90 * unitsPerPixel,
        6,
      );
    });

    it('pins the ball to the base perimeter when dragged outside', () => {
      const { camera, scene, canvas } = createControls();

      pointerDown(canvas, 500, 400);
      pointerMove(520, 400);
      pointerMove(5000, 400);

      const unitsPerPixel = getWorldUnitsPerPixel(camera, 15, VIEWPORT_HEIGHT);
      const distance = base(scene)!.position.distanceTo(ball(scene)!.position);

      /**
       * Regression guard: the old clamp normalised its direction vector
       * and so parked the ball exactly one world unit out, regardless of
       * the touch zone, the camera zoom, or the size of the base.
       */
      expect(distance).toBeCloseTo(75 * unitsPerPixel, 6);
    });

    it('clamps the reported movement to the touch zone', () => {
      const { canvas, controls } = createControls();
      const callback = vi.fn();

      pointerDown(canvas, 500, 400);
      pointerMove(520, 400);
      pointerMove(9999, 400);
      controls.update(callback);

      const movement = callback.mock.calls[0]?.[0];

      expect(movement.moveX).toBe(75);
      expect(movement.moveY).toBe(0);
      expect(movement.normalizedX).toBe(1);
      expect(movement.distance).toBe(75);
    });

    it('reports movement untouched inside the touch zone', () => {
      const { canvas, controls } = createControls();
      const callback = vi.fn();

      pointerDown(canvas, 500, 400);
      pointerMove(530, 380);
      controls.update(callback);

      const movement = callback.mock.calls[0]?.[0];

      expect(movement.moveX).toBe(30);
      expect(movement.moveY).toBe(-20);
      expect(movement.normalizedX).toBeCloseTo(30 / 75, 6);
      expect(movement.normalizedY).toBeCloseTo(-20 / 75, 6);
      expect(movement.distance).toBeCloseTo(Math.hypot(30, 20), 6);
      expect(movement.angle).toBeCloseTo(Math.atan2(-20, 30), 6);
    });
  });

  describe('ending a gesture', () => {
    it('reports null once the pointer is released', () => {
      const { canvas, controls } = createControls();
      const callback = vi.fn();

      pointerDown(canvas, 500, 400);
      pointerMove(520, 400);
      pointerUp(520, 400);
      controls.update(callback);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('resets after a press that never moved, so hovering cannot drag it', () => {
      const { scene, canvas } = createControls();

      pointerDown(canvas, 500, 400);
      pointerUp(500, 400);

      /**
       * Regression guard: `handleEventEnd` used to bail out before
       * clearing `interactionHasBegan` when no joystick had attached, so
       * a plain click left the flag set and every later mouse move —
       * with no button held — dragged a joystick around.
       */
      pointerMove(700, 500);

      expect(base(scene)).toBeUndefined();
    });

    it('ends the gesture on pointer cancel', () => {
      const { scene, canvas, controls } = createControls();
      const callback = vi.fn();

      pointerDown(canvas, 500, 400);
      pointerMove(600, 400);

      /**
       * Regression guard: there was no touchcancel listener, so an
       * interrupted touch left the joystick attached and reporting its
       * last displacement on every frame, forever.
       */
      pointerCancel(600, 400);
      controls.update(callback);

      expect(base(scene)).toBeUndefined();
      expect(callback).toHaveBeenCalledWith(null);
    });

    it('disposes the geometry and material of both meshes', () => {
      const { scene, canvas } = createControls();

      pointerDown(canvas, 500, 400);
      pointerMove(520, 400);

      const meshes = [base(scene)!, ball(scene)!];
      const spies = meshes.flatMap((mesh) => [
        vi.spyOn(mesh.geometry, 'dispose'),
        vi.spyOn(mesh.material, 'dispose'),
      ]);

      pointerUp(520, 400);

      for (const spy of spies) {
        expect(spy).toHaveBeenCalledOnce();
      }

      expect(scene.children).toHaveLength(0);
    });
  });

  describe('pointer arbitration', () => {
    it('ignores a second pointer while one is already active', () => {
      const { canvas, controls } = createControls();
      const callback = vi.fn();

      pointerDown(canvas, 500, 400, { pointerId: 1 });
      pointerMove(530, 400, { pointerId: 1 });
      pointerDown(canvas, 100, 100, { pointerId: 2 });
      pointerMove(200, 200, { pointerId: 2 });
      controls.update(callback);

      /**
       * Regression guard: reading `event.touches.item(0)` meant a second
       * finger could take over the joystick mid-drag.
       */
      expect(callback.mock.calls[0]?.[0].moveX).toBe(30);
    });

    it('does not end the gesture when a different pointer is released', () => {
      const { scene, canvas } = createControls();

      pointerDown(canvas, 500, 400, { pointerId: 1 });
      pointerMove(530, 400, { pointerId: 1 });
      pointerUp(200, 200, { pointerId: 2 });

      expect(scene.getObjectByName('joystick-base')).toBeDefined();
    });

    it('ignores non-primary mouse buttons', () => {
      const { scene, canvas } = createControls();

      pointerDown(canvas, 500, 400, { pointerType: 'mouse', button: 2 });
      pointerMove(520, 400);

      expect(base(scene)).toBeUndefined();
    });
  });

  describe('viewport handling', () => {
    it('measures against the canvas rect, not the window', () => {
      const camera = createCamera();
      const scene = createScene();
      /**
       * A canvas inset 200px from the left of the page. A press at
       * clientX 400 is 200px into the canvas, which is its horizontal
       * centre, so the base must land on the camera's centre line.
       */
      const canvas = createCanvas({ left: 200, top: 0, width: 400, height: 300 });
      const controls = new JoystickControls(camera, scene, {
        domElement: canvas,
      });

      activeControls.push(controls);

      pointerDown(canvas, 400, 150);
      pointerMove(410, 150);

      const basePosition = base(scene)!.position;

      expect(basePosition.x).toBeCloseTo(0, 6);
      expect(basePosition.y).toBeCloseTo(0, 6);
    });
  });

  describe('lifecycle', () => {
    it('keeps two joysticks in one scene independent', () => {
      const camera = createCamera();
      const scene = createScene();
      const canvasA = createCanvas();
      const canvasB = createCanvas();
      const a = new JoystickControls(camera, scene, { domElement: canvasA });
      const b = new JoystickControls(camera, scene, { domElement: canvasB });

      activeControls.push(a, b);

      pointerDown(canvasA, 300, 300, { pointerId: 1 });
      pointerMove(330, 300, { pointerId: 1 });
      pointerDown(canvasB, 700, 300, { pointerId: 2 });

      expect(a.isJoystickAttached).toBe(true);
      expect(b.isJoystickAttached).toBe(false);

      /**
       * Regression guard: both instances used to look their meshes up
       * by the same global name, so one would drive the other's.
       */
      a.destroy();

      expect(scene.children).toHaveLength(0);
    });

    it('does not stack duplicate listeners when create is called twice', () => {
      const { canvas, controls } = createControls();
      const spy = vi.spyOn(window, 'addEventListener');

      controls.create();

      expect(spy).not.toHaveBeenCalled();

      spy.mockRestore();
      pointerDown(canvas, 500, 400);
      pointerMove(520, 400);

      expect(controls.isJoystickAttached).toBe(true);
    });

    it('detaches listeners and cleans the scene on destroy', () => {
      const { scene, canvas, controls } = createControls();

      pointerDown(canvas, 500, 400);
      pointerMove(520, 400);
      controls.destroy();

      expect(scene.children).toHaveLength(0);
      expect(controls.isJoystickAttached).toBe(false);

      pointerDown(canvas, 500, 400);
      pointerMove(520, 400);

      expect(controls.isJoystickAttached).toBe(false);
    });

    it('restores the element touch-action on destroy', () => {
      const { canvas, controls } = createControls();

      expect(canvas.style.touchAction).toBe('none');

      controls.destroy();

      expect(canvas.style.touchAction).toBe('');
    });

    it('applies appearance options', () => {
      const { scene, canvas } = createControls({
        baseColor: 0xff0000,
        ballColor: 0x00ff00,
        opacity: 0.25,
      });

      pointerDown(canvas, 500, 400);
      pointerMove(520, 400);

      expect(base(scene)!.material.color.getHex()).toBe(0xff0000);
      expect(ball(scene)!.material.color.getHex()).toBe(0x00ff00);
      expect(base(scene)!.material.opacity).toBe(0.25);
    });

    it('reports null while idle', () => {
      const { controls } = createControls();
      const callback = vi.fn();

      controls.update(callback);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('falls back to the window when no element is supplied', () => {
      const camera = createCamera();
      const scene = createScene();
      const controls = new JoystickControls(camera, scene);

      activeControls.push(controls);

      pointerDown(window, 512, 384);
      pointerMove(532, 384);

      expect(scene.getObjectByName('joystick-base')).toBeDefined();
    });
  });
});
