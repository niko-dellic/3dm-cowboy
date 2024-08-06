import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FileManager } from "./components/FileManager";
import RaycastManager from "./components/RaycasterManager";
import NavigationGenerator from "./components/NavigationGenerator"; // Adjust the path as necessary
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";

// import CameraControls from "camera-controls";

let camera, scene, renderer;
let controls;
let raycastManager;
let gui;
let fileManager;
let navGen;
init();

async function init() {
  // THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

  initGUI(scene);

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

  controls = new OrbitControls(camera, renderer.domElement);

  scene = new THREE.Scene();
  navGen = new NavigationGenerator(scene);

  // scene.background = new THREE.Color("blue");

  const directionalLight = new THREE.DirectionalLight(0xffffff, 6);
  directionalLight.position.set(50, 50, 50);
  // scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  // scene.add(ambientLight);

  fileManager = new FileManager(scene, camera, renderer, controls, navGen, gui);
  let model;

  // model = await fileManager.loadFile("full_Sphere.3dm");
  model = await fileManager.loadFile("platforms.3dm");
  // model = await fileManager.loadFile("dungeon.gltf");
  // model = await fileManager.loadFile("environment.glb");

  if (model) {
    // fitCameraToObject(camera, model, 2, controls);
    // guiLayers(model.userData.layers);
    // model.children.forEach((child) => {
    //   const control = new TransformControls(camera, renderer.domElement);
    //   control.attach(child);
    //   scene.add(control);
    // });
    // raycastManager = RaycastManager(scene, camera, renderer);
  }

  // Initialize RaycastManager
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

  // if (raycastManager) {
  //   raycastManager.updateRaycaster(); // Update the raycaster within the main render loop
  // }
  renderer.render(scene, camera);
}

function initGUI() {
  gui = new GUI({ title: "Controls" });

  // add folder for file upload
  const fileFolder = gui.addFolder("File");
  fileFolder.add(
    {
      Upload: () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".3dm,.gltf,.glb";
        fileInput.style.display = "none";

        document.body.appendChild(fileInput);
        fileInput.click();

        // Remove the input after selection
        fileInput.onchange = () => {
          fileManager.handleUpload(event);

          document.body.removeChild(fileInput);
        };
      },
    },
    "Upload"
  );

  return gui;
}
