import {
  AmbientLight,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from 'three';
import { JoystickControls } from 'three-joystick';

const container = document.getElementById('target');

if (!container) {
  throw new Error('Missing #target container');
}

const scene = new Scene();
const camera = new PerspectiveCamera(50, 1, 0.1, 2000);
const renderer = new WebGLRenderer({ antialias: true });
const target = new Mesh(
  new SphereGeometry(1, 36, 36),
  new MeshPhongMaterial({ wireframe: true, color: 0xffffff }),
);

camera.position.z = 5;
scene.add(camera, target, new AmbientLight(0xffffff));

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

/**
 * Passing the canvas is what lets the joystick map pointer coordinates
 * onto it correctly when it is not the whole window.
 */
const joystickControls = new JoystickControls(camera, scene, {
  domElement: renderer.domElement,
});

const resize = (): void => {
  const { clientWidth, clientHeight } = container;

  renderer.setSize(clientWidth, clientHeight);
  camera.aspect = clientWidth / Math.max(clientHeight, 1);
  camera.updateProjectionMatrix();
};

const animate = (): void => {
  joystickControls.update((movement) => {
    if (!movement) {
      return;
    }

    /**
     * `normalizedX` and `normalizedY` are always within -1..1, so the
     * speed does not depend on the size of the screen.
     */
    const speed = 0.05;

    target.position.x += movement.normalizedX * speed;
    target.position.y -= movement.normalizedY * speed;
  });

  renderer.render(scene, camera);
};

resize();
window.addEventListener('resize', resize);
renderer.setAnimationLoop(animate);
