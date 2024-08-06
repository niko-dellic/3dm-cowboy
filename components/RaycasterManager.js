import * as THREE from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";

export default class RaycastManager {
  constructor(scene, camera, renderer, controls) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.intersectedObjects = new Set();
    this.transformControls = null;
    this.selectedObject = null;

    this.isPointerInWindow = false;
    this.objectsToExclude = new Set();

    window.addEventListener("pointermove", (event) =>
      this.onPointerMove(event)
    );
    window.addEventListener("click", (event) => this.onClick(event));

    //add event listener for escape key to remove transform controls
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (this.selectedObject) {
          this.selectedObject.material.color.set(0xffffff);
          this.selectedObject = null;
          this.removeTransformControls();
        }
      }
    });
  }

  onPointerMove(event) {
    if (
      event.clientX >= 0 &&
      event.clientX <= window.innerWidth &&
      event.clientY >= 0 &&
      event.clientY <= window.innerHeight
    ) {
      this.isPointerInWindow = true;
      this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    } else {
      this.isPointerInWindow = false;
    }
  }

  onClick(event) {
    if (!this.isPointerInWindow) return;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Filter out the objects we want to exclude from raycasting
    const objectsToIntersect = this.scene.children.filter(
      (object) => !this.objectsToExclude.has(object)
    );

    let intersects = this.raycaster.intersectObjects(objectsToIntersect, true);
    intersects = intersects.filter(
      (intersect) => intersect.object.visible && intersect.object.isMesh
    );

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      if (clickedObject.isMesh) {
        if (this.selectedObject !== clickedObject) {
          if (this.selectedObject) {
            this.selectedObject.material.color.set(0xffffff);
          }
          this.selectedObject = clickedObject;
          this.selectedObject.material.color.set(0xffff00);
          this.addTransformControls(this.selectedObject);
        }
      }
    } else {
      if (this.selectedObject) {
        this.highlightObject(this.selectedObject, true);
        this.selectedObject = null;
        this.removeTransformControls();
      }
    }
  }

  addTransformControls(object) {
    this.removeTransformControls();
    this.transformControls = new TransformControls(
      this.camera,
      this.renderer.domElement
    );
    this.transformControls.attach(object);
    this.scene.add(this.transformControls);

    // Add the TransformControls to the exclusion set
    this.objectsToExclude.add(this.transformControls);

    this.transformControls.addEventListener("dragging-changed", (event) => {
      this.controls.enabled = !event.value;
    });
  }

  removeTransformControls() {
    if (this.transformControls) {
      this.transformControls.detach();
      this.scene.remove(this.transformControls);
      // Remove the TransformControls from the exclusion set
      this.objectsToExclude.delete(this.transformControls);
      this.transformControls = null;
    }
  }

  updateRaycaster() {
    if (!this.isPointerInWindow) return;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Filter out the objects we want to exclude from raycasting
    const objectsToIntersect = this.scene.children.filter(
      (object) => !this.objectsToExclude.has(object)
    );

    let intersects = this.raycaster.intersectObjects(objectsToIntersect, true);

    intersects = intersects.filter(
      (intersect) => intersect.object.visible && intersect.object.isMesh
    );

    // Reset color of all previously intersected objects
    this.intersectedObjects.forEach((object) => {
      if (object !== this.selectedObject) {
        this.highlightObject(object, true);
      }
    });

    this.intersectedObjects.clear();

    // Highlight only the first intersected object (topmost)
    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      if (
        intersectedObject.isMesh &&
        intersectedObject !== this.selectedObject
      ) {
        this.highlightObject(intersectedObject);

        this.intersectedObjects.add(intersectedObject);
      }
    }
  }

  highlightObject(object, reset = false) {
    const line = object.children.find((child) => child.isLineSegments);
    if (!line) return;
    if (reset) {
      line.material.color.set(new THREE.Color("blue"));
    } else {
      line.material.color.set(new THREE.Color("Aqua"));
    }
  }

  dispose() {
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("click", this.onClick);
    this.removeTransformControls();
  }
}
