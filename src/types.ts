/**
 * The joystick displacement reported once per frame by
 * {@link JoystickControls.update}.
 */
export type TMovement = {
  /**
   * Horizontal displacement from the joystick anchor, in CSS pixels,
   * clamped to `joystickTouchZone`. Positive is right.
   */
  moveX: number;
  /**
   * Vertical displacement from the joystick anchor, in CSS pixels,
   * clamped to `joystickTouchZone`. Positive is down, matching the
   * browser's client coordinate system.
   */
  moveY: number;
  /**
   * `moveX` expressed as a fraction of `joystickTouchZone`, so always
   * within -1..1. Resolution independent, so prefer this over `moveX`.
   */
  normalizedX: number;
  /**
   * `moveY` expressed as a fraction of `joystickTouchZone`, so always
   * within -1..1. Resolution independent, so prefer this over `moveY`.
   */
  normalizedY: number;
  /**
   * Distance of the joystick ball from the anchor, in CSS pixels,
   * clamped to `joystickTouchZone`.
   */
  distance: number;
  /**
   * Direction of the joystick in radians, measured with `Math.atan2`
   * in client coordinates.
   */
  angle: number;
};

/**
 * Optional configuration accepted by the joystick constructors.
 */
export type JoystickOptions = {
  /**
   * The element the joystick listens on, normally `renderer.domElement`.
   *
   * Supplying it is strongly recommended: it is what lets the joystick
   * map pointer coordinates onto a canvas that is not full-window, and
   * it scopes `pointerdown` so the joystick does not react to presses
   * elsewhere on the page. When omitted the joystick falls back to
   * listening on `window` and assuming a full-window canvas.
   */
  domElement?: HTMLElement | null;
  /**
   * Radius, in CSS pixels, of the joystick base. The ball is clamped to
   * this radius and it is the divisor behind `normalizedX`/`normalizedY`.
   *
   * @defaultValue 75
   */
  joystickTouchZone?: number;
  /**
   * Distance in front of the camera at which the joystick is drawn.
   * Must sit between the camera's near and far planes.
   *
   * @defaultValue 15
   */
  joystickScale?: number;
  /**
   * Colour of the joystick base.
   *
   * @defaultValue 0xffffff
   */
  baseColor?: number;
  /**
   * Colour of the joystick ball.
   *
   * @defaultValue 0xcccccc
   */
  ballColor?: number;
  /**
   * Opacity of both joystick meshes.
   *
   * @defaultValue 0.5
   */
  opacity?: number;
  /**
   * Return `true` to stop the joystick attaching on the next press.
   * Evaluated once per gesture, on pointer down.
   *
   * @defaultValue `() => false`
   */
  preventAction?: () => boolean;
};
