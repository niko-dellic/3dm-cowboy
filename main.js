import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
//import FirstPersonControls
import { RhinoManager } from "./components/RhinoManager";

let camera, scene, renderer;
let controls;

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
  // scene.add(new THREE.DirectionalLightHelper(directionalLight, 5));

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const rhino = new RhinoManager(scene);
  let model;

  model = await rhino.loadFile("Rhino_Logo.3dm");

  if (model) {
    rhino.initGUI(model.userData.layers, scene);
  }

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
  renderer.render(scene, camera);
}
