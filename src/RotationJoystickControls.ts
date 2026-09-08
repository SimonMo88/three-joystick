import {
  type Object3D,
  type PerspectiveCamera,
  Quaternion,
  type Scene,
  Vector3,
} from 'three';
import { JoystickControls } from './JoystickControls.js';
import { type JoystickOptions, type TMovement } from './types.js';

/**
 * A joystick that rotates a target object.
 */
export class RotationJoystickControls extends JoystickControls {
  /**
   * The object being rotated.
   */
  public target: Object3D;
  /**
   * Scales the joystick displacement down into radians per frame.
   *
   * Displacement is clamped to `joystickTouchZone`, so with the
   * defaults the target turns at most `75 * 0.001` radians per frame on
   * each axis.
   */
  public deltaScale = 0.001;
  /**
   * The axis that up and down movement rotates around.
   */
  public verticalMovementAxis: Vector3 = new Vector3(1, 0, 0);
  /**
   * The axis that left and right movement rotates around.
   */
  public horizontalMovementAxis: Vector3 = new Vector3(0, 1, 0);
  /**
   * Scratch quaternion reused for each frame's rotation, so the loop
   * does not allocate.
   */
  public quaternion: Quaternion = new Quaternion();

  constructor(
    camera: PerspectiveCamera,
    scene: Scene,
    target: Object3D,
    options: JoystickOptions = {},
  ) {
    super(camera, scene, options);
    this.target = target;
  }

  /**
   * Applies a rotation about the given axis to the target.
   */
  private rotateAroundAxis = (axis: Vector3, angleInRadians: number): void => {
    if (angleInRadians === 0) {
      return;
    }

    this.quaternion.setFromAxisAngle(axis, angleInRadians);
    this.target.quaternion.premultiply(this.quaternion);
  };

  /**
   * Rotates the target in step with the joystick. Runs from the base
   * class's `update`, so `update()` still drives the rotation and
   * `update(callback)` additionally reports the movement.
   */
  protected override onUpdate = (movement: TMovement | null): void => {
    if (!movement) {
      return;
    }

    this.rotateAroundAxis(
      this.verticalMovementAxis,
      movement.moveY * this.deltaScale,
    );
    this.rotateAroundAxis(
      this.horizontalMovementAxis,
      movement.moveX * this.deltaScale,
    );
  };
}
