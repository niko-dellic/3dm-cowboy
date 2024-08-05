import * as THREE from "three";

export default function RaycastManager(scene, camera, renderer) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const intersectedObjects = new Set();

  let isPointerInWindow = false;

  function onPointerMove(event) {
    // Check if the mouse is within the window bounds
    if (
      event.clientX >= 0 &&
      event.clientX <= window.innerWidth &&
      event.clientY >= 0 &&
      event.clientY <= window.innerHeight
    ) {
      isPointerInWindow = true;
      // Calculate pointer position in normalized device coordinates
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    } else {
      isPointerInWindow = false;
    }
  }

  function updateRaycaster() {
    if (!isPointerInWindow) return;

    // Update the picking ray with the camera and pointer position
    raycaster.setFromCamera(pointer, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children);

    // Reset color of previously intersected objects
    intersectedObjects.forEach((object) => {
      object.material.color.set(0xffffff); // Assuming original color is white
    });

    intersectedObjects.clear();

    // Highlight intersected objects
    for (let i = 0; i < intersects.length; i++) {
      if (intersects[i].object.isMesh) {
        intersects[i].object.material.color.set(new THREE.Color("yellow"));
        intersectedObjects.add(intersects[i].object);
      }
    }
  }

  window.addEventListener("pointermove", onPointerMove);

  return {
    updateRaycaster,
  };
}
