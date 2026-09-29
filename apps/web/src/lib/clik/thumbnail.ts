import {
  AmbientLight,
  Box3,
  Color,
  InstancedMesh,
  Vector3,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from "three";
import {
  CATALOG,
  inherited,
  worldMatrix,
  type PartType,
  type SceneDocument,
} from "@clik/scene";
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

const sceneCache = new Map<string, string | null>();
let previewQueue = Promise.resolve();

/** One shared renderer and one preview per frame, rather than a canvas per card. */
export function creationThumbnail(
  document: SceneDocument,
  key: string,
  active: () => boolean,
): Promise<string | null> {
  const job = previewQueue.then(async () => {
    if (!active()) return null;
    if (sceneCache.has(key)) return sceneCache.get(key)!;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    if (!active()) return null;
    renderer ??= new WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(640, 480);
    const scene = new Scene();
    const bounds = new Box3();
    const material = new MeshStandardMaterial({ roughness: 0.42 });
    const meshes: InstancedMesh[] = [];
    try {
      for (const type of Object.keys(CATALOG) as PartType[]) {
        const parts = document.nodes.filter(
          (n) =>
            n.kind === "part" &&
            n.type === type &&
            !inherited(document, n.id, "hidden"),
        );
        if (!parts.length) continue;
        const shape = geometry(type);
        const mesh = new InstancedMesh(shape, material, parts.length);
        parts.forEach((part, i) => {
          const matrix = worldMatrix(document, part.id);
          mesh.setMatrixAt(i, matrix);
          if (part.kind === "part") mesh.setColorAt(i, new Color(part.color));
          bounds.union(shape.boundingBox!.clone().applyMatrix4(matrix));
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        scene.add(mesh);
        meshes.push(mesh);
      }
      if (bounds.isEmpty()) return null;
      const center = bounds.getCenter(new Vector3());
      const diameter = Math.max(bounds.getSize(new Vector3()).length(), 1);
      const camera = new OrthographicCamera(
        -4 / 3,
        4 / 3,
        1,
        -1,
        0.01,
        diameter * 5,
      );
      camera.position
        .copy(center)
        .add(new Vector3(7, 6, 8).normalize().multiplyScalar(diameter * 2));
      camera.lookAt(center);
      camera.updateMatrixWorld();
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
      camera.zoom =
        Math.min(4 / 3 / Math.max(extentX, 0.01), 1 / Math.max(extentY, 0.01)) /
        1.2;
      camera.updateProjectionMatrix();
      const light = new DirectionalLight("#ffffff", 3);
      light.position.copy(center).add(new Vector3(-3, 7, 5));
      light.target.position.copy(center);
      scene.add(new AmbientLight("#ffffff", 2), light, light.target);
      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL("image/png");
      sceneCache.set(key, url);
      if (sceneCache.size > 36)
        sceneCache.delete(sceneCache.keys().next().value!);
      return url;
    } finally {
      material.dispose();
      meshes.forEach((mesh) => mesh.dispose());
    }
  });
  previewQueue = job.then(
    () => {},
    () => {},
  );
  return job;
}
