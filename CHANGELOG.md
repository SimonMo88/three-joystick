# Changelog

## 2.0.0

A modernisation and bug-fix release. The public surface is close to
1.x, but the build output, the movement values, and the event model all
changed, so this is a major version.

### Fixed

- **A press with no drag left the joystick armed.** `handleEventEnd`
  returned early when no joystick had attached, so `interactionHasBegan`
  was never cleared. Every later mouse move, with no button held,
  dragged a joystick around the scene.
- **An interrupted touch left the joystick stuck on.** There was no
  `touchcancel` listener, so when the OS took a touch away no end event
  ever arrived, the joystick stayed attached, and `getJoystickMovement`
  kept returning its last displacement on every frame. Right-click drags
  failed the same way, because the context menu could swallow `mouseup`.
- **The ball did not stay on the base.** The clamp normalised its
  direction vector and then added it, parking the ball exactly one world
  unit from the centre regardless of `joystickTouchZone`, `joystickScale`
  or `camera.zoom`, so it never lined up with the drawn base.
- **A missing mesh could throw.** `scene.getObjectByName(...)` was cast
  with `as THREE.Object3D`, so a missing base raised a `TypeError` inside
  the animation loop. Meshes are now held by reference.
- **The base was planted in the wrong place.** Displacement was measured
  from the press, but the base was drawn wherever the first move event
  landed, so the two disagreed about their origin.
- **Reported movement was unbounded.** The ball stopped at the perimeter
  while `moveX`/`moveY` kept growing, so dragging further and further out
  accelerated without any visible feedback.
- **Pointer coordinates assumed a full-window canvas.** `getPositionInScene`
  divided by `window.innerWidth`/`innerHeight` and ignored the canvas
  offset, so any canvas that was inset or smaller than the page drew the
  joystick away from the pointer.
- **Every gesture leaked GPU memory.** A geometry and a material were
  allocated per drag and removed from the scene without being disposed.
- **The joystick was lit.** `MeshLambertMaterial` rendered black in a
  scene with no lights, and the flat `CircleGeometry` was never turned to
  face the camera, so it went edge-on for any camera not looking down -Z.
- **Multi-touch drove the wrong finger.** `event.touches.item(0)` read
  whichever touch happened to be first, so a second finger could hijack a
  drag and lifting a second finger ended it.
- **`TMovement` did not resolve for consumers.** It was declared as a
  global in `typings/global.d.ts`, which was never emitted to `dist` nor
  listed in `files`, so every typed consumer got `TS2304`.
- **The test suite did not run.** Both class test files used default
  imports against modules with only named exports, leaving
  `JoystickControls` and `RotationJoystickControls` at 0% coverage.
- **`npm ci` failed.** `prepare` ran the webpack build, which died on
  Node 17+ with `ERR_OSSL_EVP_UNSUPPORTED`.

### Changed

- Pointer Events replace the parallel mouse and touch listeners.
- Constructors take an options object. Passing `domElement`
  (your `renderer.domElement`) is strongly recommended.
- `TMovement` gains `normalizedX`, `normalizedY`, `distance` and `angle`.
  `moveX`/`moveY` keep their meaning and sign but are now clamped.
- The base is drawn at exactly `joystickTouchZone` pixels wide, whatever
  the field of view, zoom, or canvas size.
- `interactionHasBegan` is now `interactionHasBegun`.
- ESM and CJS builds with a proper `exports` map; `main`, `module`,
  `types` and `node16`/`nodenext` resolution all work.
- Toolchain: Vite, Vitest and ESLint flat config replace webpack, Babel,
  Jest and `.eslintrc`.
- Examples are built to `docs/` by CI and deployed to Pages, rather than
  committed.

### Removed

- `degreesToRadians` and `userSwipedMoreThan` helpers. Neither was
  exported from the package entry point, so neither was public API. Use
  `THREE.MathUtils.degToRad` if you need the former.
- The bootstrap dependency in the examples.

### Migration

```diff
-const controls = new JoystickControls(camera, scene);
+const controls = new JoystickControls(camera, scene, {
+  domElement: renderer.domElement,
+});

 controls.update((movement) => {
   if (!movement) return;
-  target.position.x += movement.moveX * 0.0001;
-  target.position.y += movement.moveY * 0.0001;
+  target.position.x += movement.normalizedX * 0.05;
+  target.position.y -= movement.normalizedY * 0.05;
 });
```
