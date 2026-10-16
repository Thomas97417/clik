import { type SceneDocument, type SceneNode } from "@clik/scene";

function hierarchy(scene: SceneDocument) {
  const nodes = new Map(scene.nodes.map((node) => [node.id, node]));
  const children = new Map<string | null, SceneNode[]>();
  for (const node of scene.nodes) {
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  return { nodes, children };
}

/** Represent complete branches by their group, so each piece is acted on once. */
export function completeGroupSelection(scene: SceneDocument, ids: string[]) {
  const { nodes, children } = hierarchy(scene);
  const selected = new Set(ids);
  const complete = (node: SceneNode): boolean | null => {
    if (selected.has(node.id)) return true;
    if (node.kind === "part") return false;
    // Empty branches neither select themselves nor block a complete group.
    let full: boolean | null = null;
    for (const member of children.get(node.id) ?? []) {
      const childComplete = complete(member);
      if (childComplete !== null) full = (full ?? true) && childComplete;
    }
    if (full) selected.add(node.id);
    return full;
  };
  for (const node of children.get(null) ?? []) complete(node);

  // Keep the user's selection order while replacing children by their parent.
  const selection = new Set<string>();
  for (const id of ids) {
    let node = nodes.get(id);
    if (!node) continue;
    let root = node.id;
    while (node.parentId) {
      node = nodes.get(node.parentId)!;
      if (selected.has(node.id)) root = node.id;
    }
    selection.add(root);
  }
  return [...selection];
}

/** Removing a child splits its selected ancestors and keeps the other branches. */
export function withoutSelection(
  scene: SceneDocument,
  selection: string[],
  id: string,
) {
  const { nodes, children } = hierarchy(scene);
  const parents = new Set<string>();
  let node = nodes.get(id);
  while (node?.parentId) {
    parents.add(node.parentId);
    node = nodes.get(node.parentId);
  }
  const remaining: string[] = [];
  const keep = (root: string) => {
    if (root === id) return;
    if (!parents.has(root)) {
      remaining.push(root);
      return;
    }
    for (const child of children.get(root) ?? []) keep(child.id);
  };
  for (const root of selection) keep(root);
  return remaining;
}
