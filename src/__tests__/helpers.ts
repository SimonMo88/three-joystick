import { PerspectiveCamera, Scene } from 'three';

export const VIEWPORT_WIDTH = 1024;
export const VIEWPORT_HEIGHT = 768;

/**
 * A camera with an explicit projection, so tests can assert exact world
 * space distances rather than whatever jsdom's defaults produce.
 */
export const createCamera = (): PerspectiveCamera => {
  const camera = new PerspectiveCamera(
    50,
    VIEWPORT_WIDTH / VIEWPORT_HEIGHT,
    0.1,
    2000,
  );

  camera.position.set(0, 0, 5);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  return camera;
};

export const createScene = (): Scene => new Scene();

/**
 * Stands in for `renderer.domElement`, with a bounding rect the test
 * controls. jsdom reports zeros for every element, so anything testing
 * the canvas-relative path has to supply its own.
 */
export const createCanvas = (
  rect: Partial<DOMRect> = {},
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const bounds = {
    left: 0,
    top: 0,
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    right: VIEWPORT_WIDTH,
    bottom: VIEWPORT_HEIGHT,
    x: 0,
    y: 0,
    ...rect,
  };

  canvas.getBoundingClientRect = () =>
    ({ ...bounds, toJSON: () => bounds }) as DOMRect;
  document.body.appendChild(canvas);

  return canvas;
};

type PointerOptions = {
  pointerId?: number;
  pointerType?: string;
  button?: number;
};

const dispatch = (
  target: EventTarget,
  type: string,
  clientX: number,
  clientY: number,
  options: PointerOptions = {},
): void => {
  target.dispatchEvent(
    new PointerEvent(type, {
      clientX,
      clientY,
      button: options.button ?? 0,
      pointerId: options.pointerId ?? 1,
      pointerType: options.pointerType ?? 'touch',
      bubbles: true,
      cancelable: true,
    }),
  );
};

export const pointerDown = (
  target: EventTarget,
  clientX: number,
  clientY: number,
  options?: PointerOptions,
): void => dispatch(target, 'pointerdown', clientX, clientY, options);

export const pointerMove = (
  clientX: number,
  clientY: number,
  options?: PointerOptions,
): void => dispatch(window, 'pointermove', clientX, clientY, options);

export const pointerUp = (
  clientX: number,
  clientY: number,
  options?: PointerOptions,
): void => dispatch(window, 'pointerup', clientX, clientY, options);

export const pointerCancel = (
  clientX: number,
  clientY: number,
  options?: PointerOptions,
): void => dispatch(window, 'pointercancel', clientX, clientY, options);
