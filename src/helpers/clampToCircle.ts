/**
 * A point constrained to a circle, plus the measurements taken along
 * the way so callers do not have to recompute them.
 */
export type ClampedPoint = {
  /** The clamped x coordinate. */
  x: number;
  /** The clamped y coordinate. */
  y: number;
  /** Unclamped distance from the origin. */
  distance: number;
  /** Distance from the origin after clamping, never above `radius`. */
  clampedDistance: number;
  /** True when the input fell outside the circle. */
  wasClamped: boolean;
};

/**
 * Constrains a point to a circle centred on an origin.
 *
 * Clamping in screen space rather than world space keeps the joystick
 * correct for any camera orientation, and keeps the ball's travel in
 * exact agreement with the movement reported to the caller.
 */
const clampToCircle = (
  x: number,
  y: number,
  originX: number,
  originY: number,
  radius: number,
): ClampedPoint => {
  const deltaX = x - originX;
  const deltaY = y - originY;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance <= radius || distance === 0) {
    return {
      x,
      y,
      distance,
      clampedDistance: distance,
      wasClamped: false,
    };
  }

  const scale = radius / distance;

  return {
    x: originX + deltaX * scale,
    y: originY + deltaY * scale,
    distance,
    clampedDistance: radius,
    wasClamped: true,
  };
};

export default clampToCircle;
