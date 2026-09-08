import { MathUtils, type PerspectiveCamera } from 'three';

/**
 * How many world units one CSS pixel covers, on a plane `distance`
 * units in front of the camera.
 *
 * This is what lets the joystick base be drawn at exactly the size of
 * its touch zone: a 75px `joystickTouchZone` produces a base that is
 * 75px wide on screen, whatever the field of view, zoom, or canvas
 * height happens to be.
 */
const getWorldUnitsPerPixel = (
  camera: PerspectiveCamera,
  distance: number,
  viewportHeight: number,
): number => {
  if (viewportHeight <= 0) {
    return 0;
  }

  const halfFovInRadians = MathUtils.degToRad(camera.fov * 0.5);
  const visibleHeight = (2 * distance * Math.tan(halfFovInRadians)) / camera.zoom;

  return visibleHeight / viewportHeight;
};

export default getWorldUnitsPerPixel;
