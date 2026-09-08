import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  SphereGeometry,
  type Texture,
  TextureLoader,
  WebGLRenderer,
} from 'three';
import { RotationJoystickControls } from 'three-joystick';

import bumpUrl from './images/earth_bump.jpg';
import mapUrl from './images/earth_map.jpg';
import specUrl from './images/earth_spec.jpg';

const container = document.getElementById('target');

if (!container) {
  throw new Error('Missing #target container');
}

const loader = new TextureLoader();

/**
 * Colour textures need the sRGB colour space; data textures such as the
 * bump and specular maps must stay linear.
 */
const loadColorTexture = (url: string): Texture => {
  const texture = loader.load(url);

  texture.colorSpace = SRGBColorSpace;

  return texture;
};

const scene = new Scene();
const camera = new PerspectiveCamera(50, 1, 0.1, 2000);
const renderer = new WebGLRenderer({ antialias: true });
const earth = new Mesh(
  new SphereGeometry(1, 64, 64),
  new MeshPhongMaterial({
    map: loadColorTexture(mapUrl),
    bumpMap: loader.load(bumpUrl),
    bumpScale: 0.05,
    specularMap: loader.load(specUrl),
    specular: new Color('grey'),
  }),
);
const sun = new DirectionalLight(0xffffff, 2.5);

camera.position.z = 5;
sun.position.set(60, 60, 100);
scene.add(camera, earth, sun, new AmbientLight(0xffffff, 0.6));

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const rotationJoystick = new RotationJoystickControls(camera, scene, earth, {
  domElement: renderer.domElement,
});

const resize = (): void => {
  const { clientWidth, clientHeight } = container;

  renderer.setSize(clientWidth, clientHeight);
  camera.aspect = clientWidth / Math.max(clientHeight, 1);
  camera.updateProjectionMatrix();
};

const animate = (): void => {
  earth.rotateY(0.001);
  rotationJoystick.update();
  renderer.render(scene, camera);
};

resize();
window.addEventListener('resize', resize);
renderer.setAnimationLoop(animate);
