# three-joystick

[![CI](https://github.com/SimonMo88/three-joystick/actions/workflows/ci.yml/badge.svg)](https://github.com/SimonMo88/three-joystick/actions/workflows/ci.yml)

An open source joystick for controlling a target in a [three.js](https://threejs.org) scene.

Press anywhere on the canvas and drag. The joystick base is planted
where the press landed and the ball follows your pointer, clamped to the
base. Works with touch, mouse and pen through the Pointer Events API.

- **Demos:** [Basic](https://simonmo88.github.io/three-joystick/BasicExample/) · [Rotating target](https://simonmo88.github.io/three-joystick/RotatingTargetExample/)
- **Requires:** three.js `>=0.150.0` (tested against `0.185.1`), a browser with Pointer Events

## Installation

```bash
npm i three-joystick
```

`three` is a peer dependency, so it is not installed for you. TypeScript
users should also have `@types/three`.

## JoystickControls

Reports the joystick displacement to a callback each frame and leaves
you to decide what it means.

```ts
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { JoystickControls } from 'three-joystick';

const renderer = new WebGLRenderer();
const camera = new PerspectiveCamera(50, 1, 0.1, 2000);
const scene = new Scene();

const joystickControls = new JoystickControls(camera, scene, {
  domElement: renderer.domElement,
});

renderer.setAnimationLoop(() => {
  joystickControls.update((movement) => {
    if (!movement) {
      /** The joystick is idle. */
      return;
    }

    /**
     * normalizedX and normalizedY are always within -1..1, so your
     * tuning does not change with screen size.
     */
    const speed = 0.05;

    target.position.x += movement.normalizedX * speed;
    target.position.y -= movement.normalizedY * speed;
  });

  renderer.render(scene, camera);
});
```

## RotationJoystickControls

Rotates a target object for you.

```ts
import { RotationJoystickControls } from 'three-joystick';

const rotationJoystick = new RotationJoystickControls(
  camera,
  scene,
  target,
  { domElement: renderer.domElement },
);

renderer.setAnimationLoop(() => {
  rotationJoystick.update();
  renderer.render(scene, camera);
});
```

Passing a callback to `update` still works, and reports the movement
alongside the rotation.

## Options

Every option is optional and can also be set as a property afterwards.

| Option | Default | Description |
| --- | --- | --- |
| `domElement` | `null` | The canvas to read pointers from, normally `renderer.domElement`. See the note below. |
| `joystickTouchZone` | `75` | Radius of the base in CSS pixels. Also the divisor behind `normalizedX`/`normalizedY`. |
| `joystickScale` | `15` | How far in front of the camera the joystick is drawn. Must be between the camera's near and far planes. |
| `baseColor` | `0xffffff` | Colour of the base. |
| `ballColor` | `0xcccccc` | Colour of the ball. |
| `opacity` | `0.5` | Opacity of both meshes. |
| `preventAction` | `() => false` | Return `true` to stop the joystick attaching. Checked once per gesture, on pointer down. |

### Pass your canvas

`domElement` is worth supplying. It is what lets the joystick map
pointer coordinates onto a canvas that is not the whole window, and it
scopes `pointerdown` so presses on your surrounding UI are ignored. It
also lets the joystick set `touch-action: none` for you, which stops
mobile browsers claiming the drag for scrolling.

Without it the joystick listens on `window` and assumes a full-window
canvas at the origin.

## Movement

`update` reports a `TMovement`, or `null` when the joystick is idle.

| Field | Description |
| --- | --- |
| `moveX`, `moveY` | Displacement from the anchor in CSS pixels, clamped to `joystickTouchZone`. `moveY` is positive downwards, matching client coordinates. |
| `normalizedX`, `normalizedY` | The same displacement as a fraction of `joystickTouchZone`, always within -1..1. Prefer these. |
| `distance` | Distance of the ball from the anchor in CSS pixels, clamped. |
| `angle` | Direction in radians, from `Math.atan2`. |

## Lifecycle

The constructor binds its listeners. Call `destroy()` when you tear the
scene down: it unbinds everything, ends any gesture in progress, and
disposes the joystick's geometry and material.

```ts
joystickControls.destroy();
```

`create()` re-binds after a `destroy()`. Calling it twice is a no-op.

## Development

```bash
npm install
npm run dev            # examples on http://localhost:8080
npm test               # unit tests
npm run check          # lint, typecheck and test
npm run build          # library build into dist/
npm run build:examples # demo pages into docs/
```

## License

MIT
