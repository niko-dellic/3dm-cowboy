import { init } from "recast-navigation";
import {
  threeToSoloNavMesh,
  threeToTiledNavMesh,
  threeToTileCache,
} from "recast-navigation/three";
import * as THREE from "three";
import { DebugDrawer, NavMeshHelper } from "recast-navigation/three";
import { TransformControls } from "three/addons/controls/TransformControls.js";

export default class NavigationGenerator {
  constructor(scene, tileSize = 25) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.navMeshGenerated = false;
    this.meshes = [];

    // this.config = {
    //   cs: 0.05,
    //   ch: 0.2,
    //   walkableHeight: 1,
    //   walkableClimb: 2.5,
    //   walkableRadius: 1,
    //   borderSize: 2,
    //   tileSize: this.tileSize,
    // };

    this.config = {
      cs: 0.5, // Increase cell size
      ch: 1, // Increase cell height
      walkableHeight: 1, // Adjust based on model's dimensions
      walkableClimb: 2.5, // Adjust based on model's dimensions
      walkableRadius: 1.5, // Adjust based on model's dimensions
      borderSize: 3, // Adjust to ensure proper border handling
      tileSize: this.tileSize,
    };
  }

  async init() {
    await init();
  }

  collectMeshes() {
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this.meshes.push(child);
      }
    });
  }

  async generateNavMesh(tileSize) {
    if (this.navMeshGenerated) {
      console.log("Navigation already generated");
      return;
    }

    await this.init();

    this.raycastManager.removeTransformControls();

    this.collectMeshes();

    this.config.tileSize = tileSize || this.config.tileSize;

    const soloNavMeshResult = threeToTiledNavMesh(
      this.meshes,
      this.config,
      false
    );
    const { success: soloSuccess, navMesh: soloNavMesh } = soloNavMeshResult;

    if (!soloSuccess) {
      throw new Error("NavMesh generation failed");
    } else {
      this.navMeshGenerated = true;
    }

    this.navMesh = soloNavMesh;
    this.debugDrawer = new DebugDrawer(
      this.navMesh,
      this.createNavMeshMaterial()
    );
    this.helper = new NavMeshHelper({
      navMesh: this.navMesh,
      navMeshMaterial: this.createNavMeshMaterial(),
    });

    this.scene.add(this.helper);
    this.setupResizeListener();

    return this.navMesh;
  }

  createNavMeshMaterial() {
    return new THREE.MeshStandardMaterial({
      wireframe: true,
      wireframeLinewidth: 0.1,
      emissive: "rgb(0, 255, 0)",
    });
  }

  deleteNavMesh() {
    this.scene.remove(this.helper);
    this.navMesh = null;
    this.navMeshGenerated = false;
  }

  saveNavMesh() {
    this.helper.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        this.geometryToGeojson(child.geometry);
      }
    });
  }

  setupResizeListener() {
    const onWindowResize = () => {
      this.debugDrawer.resize(window.innerWidth, window.innerHeight);
    };
    onWindowResize();
    window.addEventListener("resize", onWindowResize);
  }

  geometryToGeojson(bufferGeometry) {
    const positions = bufferGeometry.attributes.position.array;
    const vertices = [];

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      vertices.push([x, y, z]);
    }

    const geoJSON = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [vertices],
      },
      properties: {},
    };

    this.downloadGeoJSON(geoJSON);

    return geoJSON;
  }

  downloadGeoJSON(geoJSON) {
    const blob = new Blob([JSON.stringify(geoJSON)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href =
      "data:application/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(geoJSON));
    a.download = "geometry.geojson";
    a.click();
  }
}
