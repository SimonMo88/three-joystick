import { type PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { type ViewportRect } from './getViewportRect.js';

const cameraQuaternion = new Quaternion();
const cameraForward = new Vector3();

/**
 * Converts a pointer position into a point in the scene, on the plane
 * that sits `distance` world units in front of the camera.
 *
 * Two properties matter here:
 *
 * - Coordinates are measured against `viewport` rather than the window,
 *   so a canvas that is inset, offset, or smaller than the page still
 *   lines up with the pointer.
 * - Points are placed at a fixed *depth* rather than a fixed radial
 *   distance, which keeps the plane flat. That is what lets a pixel
 *   distance be converted to a world distance with a single scale
 *   factor, so the joystick base can be drawn at exactly the size of
 *   its touch zone.
 */
const getPositionInScene = (
  clientX: number,
  clientY: number,
  camera: PerspectiveCamera,
  distance: number,
  viewport: ViewportRect,
): Vector3 => {
  /**
   * `unproject` reads the camera's world matrix. The renderer refreshes
   * it once per frame, but the joystick can be driven before the first
   * render, so make sure it is current.
   */
  camera.updateMatrixWorld();

  const relativeX = ((clientX - viewport.left) / viewport.width) * 2 - 1;
  const relativeY = -((clientY - viewport.top) / viewport.height) * 2 + 1;

  const ray = new Vector3(relativeX, relativeY, 0.5)
    .unproject(camera)
    .sub(camera.position);

  camera.getWorldQuaternion(cameraQuaternion);
  cameraForward.set(0, 0, -1).applyQuaternion(cameraQuaternion);

  const depth = ray.dot(cameraForward);

  /**
   * Degenerate only if the projection is broken, but scaling by
   * `distance / 0` would quietly produce NaN positions, so leave the
   * ray untouched instead.
   */
  if (depth !== 0) {
    ray.multiplyScalar(distance / depth);
  }

  return camera.position.clone().add(ray);
};

export default getPositionInScene;
