import { Rhino3dmLoader } from "three/addons/loaders/3DMLoader.js";
import rhino3dm from "./rhino3dm/rhino3dm.module.min.js";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { compressPositions } from "three/examples/jsm/utils/GeometryCompressionUtils.js";

export class FileManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.rhinoLoader = new Rhino3dmLoader();
    this.glTFLoader = new GLTFLoader();
    this.rhinoLoader.setLibraryPath(
      "https://cdn.jsdelivr.net/npm/rhino3dm@8.0.1/"
    );
    this.boundingBoxes = [];
    this.boundingBoxesVisible = false;

    this.initRhino();
    this.addUpload();

    // add event listener for keypress delete
    document.addEventListener("keydown", (event) => {
      if (event.key === "Delete") {
        this.deleteAll();
      } else if (event.key === "B" || event.key === "b") {
        this.toggleBoundingBoxes();
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

  async loadFile(filePath) {
    return new Promise((resolve, reject) => {
      this.createLoadingSymbol();
      if (filePath.endsWith(".3dm")) {
        this.rhinoLoader.load(
          filePath,
          (object) => {
            this.standardizeUnits(
              object,
              object.userData.settings.modelUnitSystem.name
            );
            this.convertZUpToYUp(object);

            this.scene.add(object);
            this.showBoundingBoxes(object);

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
            this.showBoundingBoxes(group);
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

  parseBuffer(file) {
    this.createLoadingSymbol();
    const doc = this.rhino.File3dm.fromByteArray(new Uint8Array(file));
    const buffer = new Uint8Array(doc.toByteArray()).buffer;

    this.rhinoLoader.parse(
      buffer,
      (object) => {
        this.standardizeUnits(
          object,
          object.userData.settings.modelUnitSystem.name
        );
        this.scene.add(object);
        this.showBoundingBoxes(object);

        this.initGUI(object.userData.layers, this.scene);
        this.removeLoadingSymbol();
      },
      (progress) => {},
      (error) => {
        console.log(error);
      }
    );
  }

  showBoundingBoxes(object) {
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

  addUpload() {
    const upload = document.createElement("input");
    upload.type = "file";
    upload.style.position = "absolute";
    upload.style.top = "10px";
    upload.style.left = "10px";
    upload.style.zIndex = "100";
    document.body.appendChild(upload);

    upload.addEventListener("change", (event) => {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target.result;

        this.parseBuffer(buffer);
      };
      reader.readAsArrayBuffer(file);
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
      new THREE.LineBasicMaterial({ color: new THREE.Color("red") })
    );
    return line;
  }
}
