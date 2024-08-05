// https://github.com/isaac-mason/recast-navigation-js/tree/main/packages/recast-navigation-three

import { init } from "recast-navigation";
import {
  threeToSoloNavMesh,
  threeToTiledNavMesh,
  threeToTileCache,
} from "recast-navigation/three";
import * as THREE from "three";
import { DebugDrawer } from "recast-navigation/three";

export async function GenerateNavigation(scene) {
  /* initialize the library */
  await init();

  /* get meshes to generate the navmesh from */
  const meshes = [];

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      console.log(child);
      meshes.push(child);
    }
  });

  const config = {
    cs: 0.05,
    ch: 0.2,
  };

  /* generate a solo navmesh */
  const soloNavMeshResult = threeToSoloNavMesh(meshes, config);
  const { success: soloSuccess, navMesh: soloNavMesh } = soloNavMeshResult;

  console.log(soloNavMeshResult);

  const debugDrawer = new DebugDrawer();
  debugDrawer.resize(window.innerWidth, window.innerHeight);

  // draw a navmesh
  debugDrawer.drawNavMesh(soloNavMesh);
  debugDrawer.drawNavMeshBVTree(soloNavMesh);
  console.log(debugDrawer);
  scene.add(debugDrawer);

  return soloNavMesh;
}
