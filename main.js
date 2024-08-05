import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RhinoManager } from "./components/RhinoManager";
import RaycastManager from "./components/RaycasterManager";
// import CameraControls from "camera-controls";

let camera, scene, renderer;
let controls;
let raycastManager;

init();

async function init() {
  THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    10,
    5000
  );
  camera.position.set(26, -40, 5);
  controls = new OrbitControls(camera, renderer.domElement);

  scene = new THREE.Scene();

  const directionalLight = new THREE.DirectionalLight(0xffffff, 6);
  directionalLight.position.set(50, -50, 50);
  scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const rhino = new RhinoManager(scene, renderer);
  let model;

  model = await rhino.loadFile("platforms.3dm");

  fitCameraToObject(camera, model, 2, controls);

  if (model) {
    rhino.initGUI(model.userData.layers, scene);
  }

  // Initialize RaycastManager
  raycastManager = RaycastManager(scene, camera, renderer);

  window.addEventListener("resize", resize);
  renderer.setAnimationLoop(animate);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  controls.update();
  raycastManager.updateRaycaster(); // Update the raycaster within the main render loop
  renderer.render(scene, camera);
}

function fitCameraToObject(
  camera,
  object,
  offset = 1.25,
  controls,
  pitch = 45,
  bearing = 45
) {
  const boundingBox = new THREE.Box3().setFromObject(object);

  const size = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  const cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
  const adjustedCameraZ = cameraZ * offset;

  // Convert pitch and bearing to radians
  const pitchRad = THREE.MathUtils.degToRad(pitch);
  const bearingRad = THREE.MathUtils.degToRad(bearing);

  // Calculate camera position using spherical coordinates
  const x =
    center.x + adjustedCameraZ * Math.sin(pitchRad) * Math.cos(bearingRad);
  const y =
    center.y + adjustedCameraZ * Math.sin(pitchRad) * Math.sin(bearingRad);
  const z = center.z + adjustedCameraZ * Math.cos(pitchRad);

  camera.position.set(x, y, z);
  camera.lookAt(center);

  camera.near = 0.1;
  camera.far = adjustedCameraZ + maxDim * 2;
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(center);
    controls.maxDistance = adjustedCameraZ * 10;
    controls.update();
  }
}
