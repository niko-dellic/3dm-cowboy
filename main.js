import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FileManager } from "./components/FileManager";
import RaycastManager from "./components/RaycasterManager";
import { GenerateNavigation } from "./components/Navigation";
import { VertexNormalsHelper } from "three/addons/helpers/VertexNormalsHelper.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

// import CameraControls from "camera-controls";

let camera, scene, renderer;
let controls;
let raycastManager;
let navMeshGenerated = false;
let gui;
let fileManager;
init();

async function init() {
  // THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

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
  // scene.background = new THREE.Color("blue");

  const directionalLight = new THREE.DirectionalLight(0xffffff, 6);
  directionalLight.position.set(50, 50, 50);
  // scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  // scene.add(ambientLight);

  fileManager = new FileManager(scene, renderer);
  let model;

  // model = await fileManager.loadFile("full_Sphere.3dm");
  model = await fileManager.loadFile("platforms.3dm");
  // model = await fileManager.loadFile("dungeon.gltf");
  // model = await fileManager.loadFile("environment.glb");

  initGUI(scene);

  if (model) {
    fitCameraToObject(camera, model, 2, controls);
    guiLayers(model.userData.layers, scene);
    await initDebugger(model, scene);

    // scene.add(helper);
    generateNavigationHandler(scene);
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

function generateNavigationHandler(scene) {
  // add event listener for keypress delete
  document.addEventListener("keydown", (event) => {
    if (event.key === "G" || event.key === "g") {
      if (navMeshGenerated) {
        console.log("Navigation already generated");
        return;
      }
      GenerateNavigation(scene);
      navMeshGenerated = true;
    }
  });
}

function initDebugger(model, scene) {
  model.traverse((child) => {
    if (child.isMesh) {
      const geometry = child.geometry;
      if (geometry) {
        geometry.computeVertexNormals();
        const normals = new VertexNormalsHelper(child, 1);
        const line = addEdges(geometry);
        // scene.add(normals);
        child.add(line);
      }
    }
  });
}

function addEdges(geometry) {
  const edges = new THREE.EdgesGeometry(geometry);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({
      color: new THREE.Color("blue"),
    })
  );
  return line;
}

function initGUI(scene) {
  gui = new GUI({ title: "Controls" });

  const navTools = gui.addFolder("Navigation Generator");
  // add config slider for tilesize
  let tileSize = 25;
  navTools
    .add({ tileSize: tileSize }, "tileSize", 3, 50, 1)
    .name("Tile Size")
    .onChange((val) => {
      tileSize = val;
    });

  // add button to generate the navigation mesh
  navTools.add(
    { generateNavMesh: () => GenerateNavigation(scene, tileSize) },
    "generateNavMesh"
  );
  // add button to download the navigation mesh
  navTools.add({ downloadNavMesh: () => downloadNavMesh() }, "downloadNavMesh");
}

function guiLayers(layers) {
  // add a folder called layers
  if (!layers) return;

  const layerFolder = gui.addFolder("Layers");

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    layerFolder
      .add(layer, "visible")
      .name(layer.name)
      .onChange(function (val) {
        const name = layer.name;

        scene.traverse(function (child) {
          if (child.userData.hasOwnProperty("attributes")) {
            if ("layerIndex" in child.userData.attributes) {
              const layerName =
                layers[child.userData.attributes.layerIndex].name;

              if (layerName === name) {
                child.visible = val;
                layer.visible = val;
              }
            }
          }
        });
      });
  }
}
