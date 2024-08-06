import { Rhino3dmLoader } from "three/addons/loaders/3DMLoader.js";
import rhino3dm from "./rhino3dm/rhino3dm.module.min.js";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VertexNormalsHelper } from "three/addons/helpers/VertexNormalsHelper.js";

export class FileManager {
  constructor(scene, camera, renderer, controls, navGen, gui) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
    this.navGen = navGen;
    this.gui = gui;
    this.rhinoLoader = new Rhino3dmLoader();
    this.glTFLoader = new GLTFLoader();
    this.rhinoLoader.setLibraryPath(
      "https://cdn.jsdelivr.net/npm/rhino3dm@8.0.1/"
    );
    this.boundingBoxes = [];
    this.boundingBoxesVisible = false;

    this.initRhino();

    // add event listener for keypress delete
    document.addEventListener("keydown", (event) => {
      if (event.key === "Delete") {
        this.deleteAll();
      } else if (event.key === "B" || event.key === "b") {
        this.toggleBoundingBoxes();
      } else if (event.key === "G" || event.key === "g") {
        this.navGen.generateNavMesh().then((result) => {
          if (result) this.guiExport();
        });
      }
    });
  }

  async initRhino() {
    //create invisible loader
    this.loading = document.createElement("div");
    this.loading.id = "loader";

    this.rhino = await rhino3dm();
  }

  createLoadingSymbol() {
    document.body.appendChild(this.loading);
  }

  removeLoadingSymbol() {
    document.body.removeChild(this.loading);
  }

  processObject(object) {
    this.standardizeUnits(
      object,
      object.userData.settings.modelUnitSystem.name
    );
    this.convertZUpToYUp(object);

    this.scene.add(object);
    this.addBoundingBox(object);

    object.traverse((child) => {
      if (child.isMesh) {
        const geometry = child.geometry;
        if (geometry) {
          const line = this.addEdges(geometry);
          child.add(line);
        }
      }
    });

    this.guiLayers(object.userData.layers, this.gui);
    this.guiNavMesh(this.gui);
    this.fitCameraToObject(this.camera, object, 2, this.controls);
    this.initDebugger(object);
  }

  async loadFile(filePath) {
    return new Promise((resolve, reject) => {
      this.createLoadingSymbol();
      if (filePath.endsWith(".3dm")) {
        this.rhinoLoader.load(
          filePath,
          (object) => {
            this.processObject(object);

            this.removeLoadingSymbol();
            resolve(object);
          },
          (progress) => {
            console.log((progress.loaded / progress.total) * 100 + "%");
          },
          (error) => {
            console.log(error);
            reject(error);
          }
        );
      } else if (filePath.endsWith(".glb") || filePath.endsWith(".gltf")) {
        this.glTFLoader.load(
          filePath,
          (gltf) => {
            const group = new THREE.Group();
            gltf.scene.children.forEach((child) => {
              if (child.isMesh) {
                group.add(child);
              }
            });
            this.scene.add(group);
            this.removeLoadingSymbol();
            this.addBoundingBox(group);
            resolve(group);
          },
          (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + "%");
          },
          (error) => {
            console.log(error);
            reject(error);
          }
        );
      }
    });
  }

  handleUpload(event) {
    console.log("uploading file");
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target.result;
      this.parseBuffer(buffer);
    };
    reader.readAsArrayBuffer(file);
  }

  parseBuffer(file) {
    this.createLoadingSymbol();
    const doc = this.rhino.File3dm.fromByteArray(new Uint8Array(file));
    const buffer = new Uint8Array(doc.toByteArray()).buffer;

    this.rhinoLoader.parse(
      buffer,
      (object) => {
        this.processObject(object);
        this.removeLoadingSymbol();
      },
      (progress) => {},
      (error) => {
        console.log(error);
      }
    );
  }

  addBoundingBox(object) {
    const box = new THREE.BoxHelper(object, 0xffff00);
    box.visible = this.boundingBoxesVisible;
    this.boundingBoxes.push(box);
    this.scene.add(box);
  }

  toggleBoundingBoxes() {
    this.boundingBoxesVisible = !this.boundingBoxesVisible;
    this.boundingBoxes.forEach((box) => {
      box.visible = this.boundingBoxesVisible;
    });
  }

  standardizeUnits(object, units) {
    const conversion = {
      UnitSystem_Millimeters: 0.001,
      UnitSystem_Centimeters: 0.01,
      UnitSystem_Meters: 1,
      UnitSystem_Kilometers: 1000,
      UnitSystem_Inches: 0.0254,
      UnitSystem_Feet: 0.3048,
      UnitSystem_Yards: 0.9144,
      UnitSystem_Miles: 1609,
    };

    let factor = conversion[units] || 1;

    object.traverse((child) => {
      if (child.isMesh) {
        // Apply scaling to the mesh's geometry
        child.geometry.scale(factor, factor, factor);

        // Reset the mesh's scale to 1,1,1
        child.scale.set(1, 1, 1);

        // Update the mesh's matrix
        child.updateMatrix();
      }
    });

    // Update the entire object's matrix
    object.updateMatrixWorld(true);
  }
  convertZUpToYUp(object) {
    object.traverse((child) => {
      if (child.isMesh) {
        // Create a rotation matrix for -90 degrees around the X-axis
        const rotationMatrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);

        // Apply the rotation to the mesh's geometry
        child.geometry.applyMatrix4(rotationMatrix);

        // Update the mesh's matrix
        child.updateMatrix();
      }
    });

    // Update the entire object's matrix
    object.updateMatrixWorld(true);
  }
  deleteAll() {
    const objectsToRemove = [];

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.BoxHelper) {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach((object) => {
      let parent = object.parent;
      parent.remove(object);
      this.scene.remove(object);
      if (object.geometry) object.geometry.dispose(); // Dispose geometry if needed
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose()); // Dispose materials if needed
        } else {
          object.material.dispose(); // Dispose material if needed
        }
      }
    });

    this.renderer.renderLists.dispose();
  }

  initDebugger(model, scene) {
    model.traverse((child) => {
      if (child.isMesh) {
        const geometry = child.geometry;
        if (geometry) {
          geometry.computeVertexNormals();
          const normals = new VertexNormalsHelper(child, 0.1);
          const line = addEdges(geometry);
          // scene.add(normals);
          scene.add(line);
        }
      }
    });
  }

  addEdges(geometry) {
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color: new THREE.Color("blue"),
      })
    );
    return line;
  }

  guiLayers(layers, gui) {
    // add a folder called layers
    if (!layers) return;

    const layerFolder = gui.addFolder("Layers");
    const scene = this.scene;

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

  guiNavMesh(gui) {
    const navTools = gui.addFolder("Navigation Generator");
    // add config slider for tilesize
    let tileSize = 25;
    const navGen = this.navGen;
    navTools
      .add({ tileSize: tileSize }, "tileSize", 3, 50, 1)
      .name("Tile Size")
      .onChange((val) => {
        tileSize = val;
      });

    // add button to generate the navigation mesh
    navTools.add(
      {
        Generate: async () => {
          const result = await navGen.generateNavMesh(tileSize);
          if (result) this.guiExport(gui);
        },
      },
      "Generate"
    );
  }

  guiExport() {
    // add a folder called export
    const exportFolder = this.gui.addFolder("Export");
    const navGen = this.navGen;
    exportFolder.add(
      { DownloadGeoJson: () => navGen.saveNavMesh() },
      "DownloadGeoJson"
    );
    exportFolder.add(
      {
        Delete: () => {
          navGen.deleteNavMesh();
          exportFolder.destroy();
        },
      },
      "Delete"
    );
  }

  fitCameraToObject(
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

  initDebugger(object) {
    object.traverse((child) => {
      if (child.isMesh) {
        const geometry = child.geometry;
        if (geometry) {
          geometry.computeVertexNormals();
          const normals = new VertexNormalsHelper(child, 1);

          // make invisible
          normals.visible = false;
          child.add(normals);

          // add event listener for keypress N
          document.addEventListener("keydown", (event) => {
            if (event.key === "N" || event.key === "n") {
              normals.visible = !normals.visible;
            }
          });
        }
      }
    });
  }
}
