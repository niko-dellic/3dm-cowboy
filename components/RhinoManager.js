import { Rhino3dmLoader } from "three/addons/loaders/3DMLoader.js";
import rhino3dm from "./rhino3dm/rhino3dm.module.min.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

import * as THREE from "three";

export class RhinoManager {
  constructor(scene) {
    this.scene = scene;
    this.loader = new Rhino3dmLoader();
    this.loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@8.0.1/");

    this.initRhino();
    this.addUpload();

    // add event listener for keypress delete
    document.addEventListener("keydown", (event) => {
      if (event.key === "Delete") {
        this.deleteAll();
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

      this.loader.load(
        filePath,
        (object) => {
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
    });
  }

  parseBuffer(file) {
    this.createLoadingSymbol();

    const doc = this.rhino.File3dm.fromByteArray(new Uint8Array(file));
    const buffer = new Uint8Array(doc.toByteArray()).buffer;

    this.loader.parse(
      buffer,
      (object) => {
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
    this.scene.add(box);
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

  initGUI(layers, scene) {
    const gui = new GUI({ title: "layers" });

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      gui
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

  deleteAll() {
    const objectsToRemove = [];

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach((object) => {
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
  }
}
