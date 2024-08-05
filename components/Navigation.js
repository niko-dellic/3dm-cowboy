// https://github.com/isaac-mason/recast-navigation-js/tree/main/packages/recast-navigation-three

import { init } from "recast-navigation";
import {
  threeToSoloNavMesh,
  threeToTiledNavMesh,
  threeToTileCache,
} from "recast-navigation/three";
import * as THREE from "three";
import { DebugDrawer, NavMeshHelper } from "recast-navigation/three";

export async function GenerateNavigation(scene, tileSize = 24) {
  /* initialize the library */
  await init();

  /* get meshes to generate the navmesh from */
  const meshes = [];

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshes.push(child);
    }
  });

  const config = {
    cs: 0.05,
    ch: 0.2,
    walkableHeight: 1,
    walkableClimb: 2.5,
    walkableRadius: 1,
    borderSize: 2,
    tileSize: tileSize,
  };

  /* generate a solo navmesh */
  // const soloNavMeshResult = threeToSoloNavMesh(meshes, config, false);
  const soloNavMeshResult = threeToTiledNavMesh(meshes, config, false);
  const { success: soloSuccess, navMesh: soloNavMesh } = soloNavMeshResult;
  const navMesh = soloNavMeshResult.navMesh;

  const navMeshMaterial = new THREE.MeshStandardMaterial({
    wireframe: true,
    wireframeLinewidth: 0.1,
    emissive: "rgb(0, 255, 0)",
  });

  // Initialize DebugDrawer with the red point material
  const debugDrawer = new DebugDrawer(navMesh, navMeshMaterial);
  // debugDrawer.drawNavMesh(soloNavMesh);
  // debugDrawer.traverse((child) => {
  //   if (child instanceof THREE.Mesh) {
  //     child.material = navMeshMaterial;
  //   }
  // });

  const helper = new NavMeshHelper({ navMesh, navMeshMaterial });
  scene.add(helper);

  console.log(helper);
  helper.children.forEach((child) => {
    if (child instanceof THREE.Mesh) {
      const data = geometryToGeojson(child.geometry);
      console.log(data);
    }
  });

  const onWindowResize = () => {
    debugDrawer.resize(window.innerWidth, window.innerHeight);
  };
  onWindowResize();
  window.addEventListener("resize", onWindowResize);

  return soloNavMesh;
}

function geometryToGeojson(bufferGeometry) {
  const positions = bufferGeometry.attributes.position.array;
  const vertices = [];

  // Loop through the positions to extract vertices
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    vertices.push([x, y, z]);
  }

  // Create a GeoJSON Polygon feature
  const geoJSON = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [vertices],
    },
    properties: {},
  };

  // download geojson
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

  return geoJSON;
}
