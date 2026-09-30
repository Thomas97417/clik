import { reparent, type SceneDocument } from "@clik/scene";

/** Shared by the temporary tree preview and the single committed operation. */
export function moveTreeBranches(
  source: SceneDocument,
  ids: string[],
  parentId: string | null,
  before?: string,
) {
  if (!ids.length || (before && ids.includes(before))) return source;
  const moving = new Set(ids);
  const changed = ids.filter(
    (id) => source.nodes.find((n) => n.id === id)!.parentId !== parentId,
  );
  const scene = reparent(source, changed, parentId);
  const branches = scene.nodes.filter((n) => moving.has(n.id));
  scene.nodes = scene.nodes.filter((n) => !moving.has(n.id));
  const index = before ? scene.nodes.findIndex((n) => n.id === before) : -1;
  scene.nodes.splice(index < 0 ? scene.nodes.length : index, 0, ...branches);
  // Moving an already-last branch must not create an undo entry.
  const previousSiblings = source.nodes.filter((n) => n.parentId === parentId);
  return !changed.length &&
    scene.nodes
      .filter((n) => n.parentId === parentId)
      .every((n, i) => n.id === previousSiblings[i].id)
    ? source
    : scene;
}
