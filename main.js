import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FileManager } from "./components/FileManager";
import RaycastManager from "./components/RaycasterManager";
import NavigationGenerator from "./components/NavigationGenerator"; // Adjust the path as necessary
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

let camera, scene, renderer;
let controls;
let raycastManager;
let gui;
let fileManager;
let navGen;
init();

async function init() {
  // do mobile check
  if (mobileCheck()) {
    //add mobile to the body class
    document.body.classList.add("mobile");
  }

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

  const directionalLight = new THREE.DirectionalLight(0xffffff, 6);
  directionalLight.position.set(50, 50, 50);
  // scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  // scene.add(ambientLight);

  fileManager = new FileManager(scene, camera, renderer, controls, navGen, gui);
  raycastManager = new RaycastManager(scene, camera, renderer, controls);
  navGen.raycastManager = raycastManager;

  // await fileManager.loadFile("full_Sphere.3dm");
  await fileManager.loadFile("platforms.3dm");
  // await fileManager.loadFile("dungeon.gltf");
  // await fileManager.loadFile("environment.glb");

  window.addEventListener("resize", resize);
  renderer.setAnimationLoop(animate);
}

function mobileCheck() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  if (mobileCheck()) {
    document.body.classList.add("mobile");
  } else if (document.body.classList.contains("mobile")) {
    document.body.classList.remove("mobile");
  }
}

function animate() {
  controls.update();

  if (raycastManager) {
    raycastManager.updateRaycaster();
  }
  renderer.render(scene, camera);
}

function initGUI() {
  gui = new GUI({ title: "3DM COWBOY" });

  if (mobileCheck()) {
    gui.close();
  }

  // add folder for file upload
  const fileFolder = gui.addFolder("File");

  // add a folder to explain the proejct
  fileFolder.add(
    {
      Yeehaw:
        "This project is a 3D model viewer that allows you to upload 3dm, gltf, and glb files. You can also generate a navigation mesh from the uploaded 3dm files.",
    },
    "Yeehaw"
  );

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
