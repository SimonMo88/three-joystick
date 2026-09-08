import {
  CircleGeometry,
  Mesh,
  MeshBasicMaterial,
  type PerspectiveCamera,
  Quaternion,
  type Scene,
  Vector2,
  type Vector3,
} from 'three';
import clampToCircle from './helpers/clampToCircle.js';
import getPositionInScene from './helpers/getPositionInScene.js';
import getViewportRect, { type ViewportRect } from './helpers/getViewportRect.js';
import getWorldUnitsPerPixel from './helpers/getWorldUnitsPerPixel.js';
import { type JoystickOptions, type TMovement } from './types.js';

type JoystickMesh = Mesh<CircleGeometry, MeshBasicMaterial>;

/**
 * Radius of the ball as a fraction of the base radius.
 */
const BALL_RADIUS_RATIO = 0.5;

/**
 * Render orders high enough to put the joystick above ordinary scene
 * content. Paired with `depthTest: false` so the joystick is drawn on
 * top no matter where it sits in the scene.
 */
const BASE_RENDER_ORDER = 999;
const BALL_RENDER_ORDER = 1000;

/**
 * A screen space joystick drawn into a three.js scene.
 *
 * Press anywhere on the canvas and drag: the base is planted where the
 * press landed and the ball follows the pointer, clamped to
 * `joystickTouchZone`. Call {@link update} once per frame to read the
 * displacement.
 */
export class JoystickControls {
  /**
   * The three.js scene the joystick draws itself into.
   */
  scene: Scene;
  /**
   * The camera the joystick is positioned in front of.
   */
  camera: PerspectiveCamera;
  /**
   * The element pointer events are read from, normally
   * `renderer.domElement`. `null` means listen on `window` and assume a
   * full-window canvas.
   */
  domElement: HTMLElement | null;
  /**
   * Radius of the joystick base in CSS pixels. The ball is clamped to
   * this radius and the reported movement is normalised against it.
   */
  joystickTouchZone = 75;
  /**
   * Distance in front of the camera at which the joystick is drawn.
   */
  joystickScale = 15;
  /**
   * Colour of the joystick base.
   */
  baseColor = 0xffffff;
  /**
   * Colour of the joystick ball.
   */
  ballColor = 0xcccccc;
  /**
   * Opacity of both joystick meshes.
   */
  opacity = 0.5;
  /**
   * Where the gesture started, in client coordinates. The base is drawn
   * here and all displacement is measured from here.
   */
  baseAnchorPoint: Vector2 = new Vector2();
  /**
   * The pointer's current position, in client coordinates.
   */
  touchPoint: Vector2 = new Vector2();
  /**
   * Return `true` to stop the joystick attaching. Evaluated once per
   * gesture, when the pointer goes down.
   */
  preventAction: () => boolean = () => false;
  /**
   * True between pointer down and pointer up, whether or not the
   * joystick has become visible yet.
   */
  interactionHasBegun = false;
  /**
   * True while the joystick meshes are in the scene.
   */
  isJoystickAttached = false;

  /**
   * Meshes are held by reference rather than looked up by name, so that
   * several joysticks can share one scene and so a missing mesh can
   * never be mistaken for a present one.
   */
  private joystickBase: JoystickMesh | null = null;
  private joystickBall: JoystickMesh | null = null;
  /**
   * The pointer that owns the current gesture. Every other pointer is
   * ignored until it ends, so a second finger cannot hijack the
   * joystick and lifting a second finger cannot end it.
   */
  private activePointerId: number | null = null;
  /**
   * The element `create` bound `pointerdown` to, remembered so that
   * `destroy` unbinds from the same element.
   */
  private pointerDownTarget: EventTarget | null = null;
  private previousTouchAction: string | null = null;
  /**
   * Base radius in world units, derived from `joystickTouchZone` when
   * the joystick is attached.
   */
  private baseRadius = 0;
  private readonly billboardQuaternion = new Quaternion();

  constructor(
    camera: PerspectiveCamera,
    scene: Scene,
    options: JoystickOptions = {},
  ) {
    this.camera = camera;
    this.scene = scene;
    this.domElement = options.domElement ?? null;

    if (options.joystickTouchZone !== undefined) {
      this.joystickTouchZone = options.joystickTouchZone;
    }

    if (options.joystickScale !== undefined) {
      this.joystickScale = options.joystickScale;
    }

    if (options.baseColor !== undefined) {
      this.baseColor = options.baseColor;
    }

    if (options.ballColor !== undefined) {
      this.ballColor = options.ballColor;
    }

    if (options.opacity !== undefined) {
      this.opacity = options.opacity;
    }

    if (options.preventAction !== undefined) {
      this.preventAction = options.preventAction;
    }

    this.create();
  }

  /**
   * Starts a gesture, unless one is already in flight or the host has
   * vetoed it.
   */
  private handlePointerDown = (event: PointerEvent): void => {
    if (this.activePointerId !== null) {
      return;
    }

    /**
     * Only the primary mouse button drives the joystick. A right click
     * opens a context menu that can swallow the matching pointer up,
     * which used to leave the joystick stuck on.
     */
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    if (this.preventAction()) {
      return;
    }

    this.activePointerId = event.pointerId;
    this.onStart(event.clientX, event.clientY);
  };

  /**
   * Plots the anchor point.
   */
  private onStart = (clientX: number, clientY: number): void => {
    this.baseAnchorPoint.set(clientX, clientY);
    /**
     * Seed the touch point too, so a gesture can never open holding the
     * displacement left behind by the previous one.
     */
    this.touchPoint.set(clientX, clientY);
    this.interactionHasBegun = true;
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    this.onMove(event.clientX, event.clientY);
  };

  /**
   * Attaches the joystick on the first movement of a gesture, then
   * tracks the pointer.
   */
  private onMove = (clientX: number, clientY: number): void => {
    this.touchPoint.set(clientX, clientY);

    const viewport = getViewportRect(this.domElement);
    const joystickBall = this.joystickBall ?? this.attachJoystick(viewport);

    this.updateJoystickBallPosition(joystickBall, viewport);
  };

  /**
   * Ends the gesture on pointer up and on pointer cancel.
   *
   * Handling cancel matters: when the OS takes a touch away, no pointer
   * up arrives, and without this the joystick would stay attached and
   * keep reporting its last displacement forever.
   */
  private handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    this.onEnd();
  };

  /**
   * Returns to the idle state. Safe to call at any point in a gesture,
   * including one that never attached the joystick.
   */
  private onEnd = (): void => {
    this.activePointerId = null;
    this.interactionHasBegun = false;
    /**
     * Collapse the displacement to zero so a stale delta cannot be read
     * back after the gesture.
     */
    this.touchPoint.copy(this.baseAnchorPoint);

    this.detachJoystick();
  };

  /**
   * Builds one of the two joystick meshes.
   */
  private createJoystickUI = (
    name: string,
    position: Vector3,
    color: number,
    radius: number,
    renderOrder: number,
  ): JoystickMesh => {
    const geometry = new CircleGeometry(radius, 64);
    /**
     * Basic rather than Lambert: the joystick is a HUD element, and an
     * unlit material keeps it legible in scenes with no lights, one
     * light, or a moving light.
     */
    const material = new MeshBasicMaterial({
      color,
      opacity: this.opacity,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const uiElement: JoystickMesh = new Mesh(geometry, material);

    uiElement.name = name;
    uiElement.renderOrder = renderOrder;
    uiElement.position.copy(position);
    uiElement.frustumCulled = false;
    this.scene.add(uiElement);

    return uiElement;
  };

  /**
   * Creates the base and ball, both anchored at the point where the
   * gesture started.
   */
  private attachJoystick = (viewport: ViewportRect): JoystickMesh => {
    const unitsPerPixel = getWorldUnitsPerPixel(
      this.camera,
      this.joystickScale,
      viewport.height,
    );

    this.baseRadius = this.joystickTouchZone * unitsPerPixel;

    /**
     * Anchored at the press, not at the first movement, so that what is
     * drawn and what is reported share an origin.
     */
    const basePosition = getPositionInScene(
      this.baseAnchorPoint.x,
      this.baseAnchorPoint.y,
      this.camera,
      this.joystickScale,
      viewport,
    );

    const joystickBall = this.createJoystickUI(
      'joystick-ball',
      basePosition,
      this.ballColor,
      this.baseRadius * BALL_RADIUS_RATIO,
      BALL_RENDER_ORDER,
    );

    this.joystickBase = this.createJoystickUI(
      'joystick-base',
      basePosition,
      this.baseColor,
      this.baseRadius,
      BASE_RENDER_ORDER,
    );
    this.joystickBall = joystickBall;
    this.isJoystickAttached = true;
    this.faceCamera();

    return joystickBall;
  };

  /**
   * Removes the joystick from the scene and releases its GPU
   * resources. A gesture allocates a geometry and a material per mesh,
   * so skipping the disposal leaks a little VRAM on every drag.
   */
  private detachJoystick = (): void => {
    this.disposeMesh(this.joystickBase);
    this.disposeMesh(this.joystickBall);

    this.joystickBase = null;
    this.joystickBall = null;
    this.isJoystickAttached = false;
  };

  private disposeMesh = (mesh: JoystickMesh | null): void => {
    if (!mesh) {
      return;
    }

    this.scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  };

  /**
   * Turns both meshes to face the camera.
   *
   * A `CircleGeometry` lies in the XY plane, so without this the
   * joystick would go edge on, and eventually invisible, for any camera
   * that is not looking straight down -Z.
   */
  private faceCamera = (): void => {
    if (!this.joystickBase || !this.joystickBall) {
      return;
    }

    this.camera.getWorldQuaternion(this.billboardQuaternion);
    this.joystickBase.quaternion.copy(this.billboardQuaternion);
    this.joystickBall.quaternion.copy(this.billboardQuaternion);
  };

  /**
   * Moves the ball to the pointer, clamped to the perimeter of the
   * base.
   */
  private updateJoystickBallPosition = (
    joystickBall: JoystickMesh,
    viewport: ViewportRect,
  ): void => {
    const clamped = clampToCircle(
      this.touchPoint.x,
      this.touchPoint.y,
      this.baseAnchorPoint.x,
      this.baseAnchorPoint.y,
      this.joystickTouchZone,
    );

    joystickBall.position.copy(
      getPositionInScene(
        clamped.x,
        clamped.y,
        this.camera,
        this.joystickScale,
        viewport,
      ),
    );
  };

  /**
   * The displacement of the joystick from its anchor, or `null` when
   * the joystick is not attached.
   *
   * Clamped to `joystickTouchZone`, so it agrees with the ball the user
   * can see instead of growing without limit as they drag away.
   */
  protected getJoystickMovement = (): TMovement | null => {
    if (!this.isJoystickAttached) {
      return null;
    }

    const clamped = clampToCircle(
      this.touchPoint.x,
      this.touchPoint.y,
      this.baseAnchorPoint.x,
      this.baseAnchorPoint.y,
      this.joystickTouchZone,
    );

    const moveX = clamped.x - this.baseAnchorPoint.x;
    const moveY = clamped.y - this.baseAnchorPoint.y;
    const divisor = this.joystickTouchZone > 0 ? this.joystickTouchZone : 1;

    return {
      moveX,
      moveY,
      normalizedX: moveX / divisor,
      normalizedY: moveY / divisor,
      distance: clamped.clampedDistance,
      angle: Math.atan2(moveY, moveX),
    };
  };

  /**
   * Hook for subclasses, called once per {@link update} before the
   * caller's callback.
   */
  protected onUpdate = (_movement: TMovement | null): void => {
    /** Intentionally empty. */
  };

  /**
   * Binds the pointer listeners. Called by the constructor, and safe to
   * call again after {@link destroy}. Calling it twice does not stack
   * duplicate listeners.
   */
  public create = (): void => {
    if (this.pointerDownTarget) {
      return;
    }

    /**
     * Pointer down is scoped to the canvas when one was supplied, so
     * the joystick ignores presses on surrounding UI. Move and end stay
     * on the window so a drag that leaves the canvas still completes.
     */
    this.pointerDownTarget = this.domElement ?? window;
    this.pointerDownTarget.addEventListener(
      'pointerdown',
      this.handlePointerDown as EventListener,
    );
    window.addEventListener('pointermove', this.handlePointerMove as EventListener);
    window.addEventListener('pointerup', this.handlePointerEnd as EventListener);
    window.addEventListener('pointercancel', this.handlePointerEnd as EventListener);

    /**
     * Stops the browser claiming the gesture for scrolling or
     * pinch-zoom, which would otherwise cancel the pointer mid-drag.
     */
    if (this.domElement) {
      this.previousTouchAction = this.domElement.style.touchAction;
      this.domElement.style.touchAction = 'none';
    }
  };

  /**
   * Unbinds every listener, ends any gesture in progress, and disposes
   * the joystick meshes.
   */
  public destroy = (): void => {
    if (this.pointerDownTarget) {
      this.pointerDownTarget.removeEventListener(
        'pointerdown',
        this.handlePointerDown as EventListener,
      );
      this.pointerDownTarget = null;
    }

    window.removeEventListener('pointermove', this.handlePointerMove as EventListener);
    window.removeEventListener('pointerup', this.handlePointerEnd as EventListener);
    window.removeEventListener('pointercancel', this.handlePointerEnd as EventListener);

    if (this.domElement && this.previousTouchAction !== null) {
      this.domElement.style.touchAction = this.previousTouchAction;
      this.previousTouchAction = null;
    }

    this.onEnd();
  };

  /**
   * Call once per frame from your animation loop. The callback receives
   * the current displacement, or `null` when the joystick is idle.
   */
  public update = (callback?: (movement: TMovement | null) => void): void => {
    /**
     * Re-aimed every frame rather than only on movement, so the
     * joystick stays square to a camera that moves under it.
     */
    this.faceCamera();

    const movement = this.getJoystickMovement();

    this.onUpdate(movement);
    callback?.(movement);
  };
}
