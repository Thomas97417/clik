import type { SceneDocument } from "@clik/scene";

/** Only these fields affect world transforms and physical intersections. */
export function sceneLayoutKey(scene: SceneDocument) {
  return JSON.stringify(
    scene.nodes.map((node) => [
      node.id,
      node.kind,
      node.parentId,
      node.kind === "part" ? node.type : null,
      node.position,
      node.rotation,
    ]),
  );
}
