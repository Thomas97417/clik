import {
  AmbientLight,
  Vector3,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { CATALOG, type PartType } from "@clik/scene";
import { geometry } from "./geometry";
const cache = new Map<string, string>();
let renderer: WebGLRenderer | undefined;
export function partThumbnail(type: PartType, color: string) {
  const key = `${type}:${color}`;
  if (cache.has(key)) return cache.get(key)!;
  renderer ??= new WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(160, 100);
  const scene = new Scene(),
    camera = new OrthographicCamera(-3, 3, 1.875, -1.875, 0.1, 30);
  camera.position.set(7, 6, 8);
  camera.lookAt(0, CATALOG[type].h / 2, 0);
  const mesh = new Mesh(
    geometry(type),
    new MeshStandardMaterial({ color, roughness: 0.3 }),
  );
  // Fit the projected bounding box, with a consistent margin for larger models.
  camera.updateMatrixWorld();
  const bounds = mesh.geometry.boundingBox!;
  let extentX = 0,
    extentY = 0;
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new Vector3(x, y, z).applyMatrix4(
          camera.matrixWorldInverse,
        );
        extentX = Math.max(extentX, Math.abs(point.x));
        extentY = Math.max(extentY, Math.abs(point.y));
      }
  camera.zoom = Math.min(1, 3 / (extentX * 1.12), 1.875 / (extentY * 1.12));
  camera.updateProjectionMatrix();
  scene.add(mesh, new AmbientLight("#ffffff", 2));
  const light = new DirectionalLight("#ffffff", 3);
  light.position.set(-3, 7, 5);
  scene.add(light);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  mesh.material.dispose();
  cache.set(key, url);
  return url;
}
