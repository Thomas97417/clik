import { z } from "zod";
import { Box3, Matrix4, Quaternion, Vector3, Euler } from "three";
export const CATALOG = {
  "brick-1x1": { name: "Brique 1 × 1", w: 1, d: 1, h: 1.2, shape: "block" },
  "brick-1x2": { name: "Brique 1 × 2", w: 2, d: 1, h: 1.2, shape: "block" },
  "brick-1x3": { name: "Brique 1 × 3", w: 3, d: 1, h: 1.2, shape: "block" },
  "brick-1x4": { name: "Brique 1 × 4", w: 4, d: 1, h: 1.2, shape: "block" },
  "brick-1x6": { name: "Brique 1 × 6", w: 6, d: 1, h: 1.2, shape: "block" },
  "brick-2x2": { name: "Brique 2 × 2", w: 2, d: 2, h: 1.2, shape: "block" },
  "brick-2x3": { name: "Brique 2 × 3", w: 3, d: 2, h: 1.2, shape: "block" },
  "brick-2x4": { name: "Brique 2 × 4", w: 4, d: 2, h: 1.2, shape: "block" },
  "plate-1x1": { name: "Plaque 1 × 1", w: 1, d: 1, h: 0.4, shape: "block" },
  "plate-1x2": { name: "Plaque 1 × 2", w: 2, d: 1, h: 0.4, shape: "block" },
  "plate-1x3": { name: "Plaque 1 × 3", w: 3, d: 1, h: 0.4, shape: "block" },
  "plate-1x4": { name: "Plaque 1 × 4", w: 4, d: 1, h: 0.4, shape: "block" },
  "plate-2x2": { name: "Plaque 2 × 2", w: 2, d: 2, h: 0.4, shape: "block" },
  "plate-2x3": { name: "Plaque 2 × 3", w: 3, d: 2, h: 0.4, shape: "block" },
  "plate-2x4": { name: "Plaque 2 × 4", w: 4, d: 2, h: 0.4, shape: "block" },
  "plate-4x4": { name: "Plaque 4 × 4", w: 4, d: 4, h: 0.4, shape: "block" },
  "slope-2x1": { name: "Pente 2 × 1", w: 1, d: 2, h: 1.2, shape: "slope" },
  "slope-2x2": { name: "Pente 2 × 2", w: 2, d: 2, h: 1.2, shape: "slope" },
  "slope-2x3": { name: "Pente 2 × 3", w: 3, d: 2, h: 1.2, shape: "slope" },
  "slope-3x2": { name: "Pente 3 × 2", w: 2, d: 3, h: 1.2, shape: "slope" },
  "tile-1x1": { name: "Tuile lisse 1 × 1", w: 1, d: 1, h: 0.4, shape: "tile" },
  "tile-1x2": { name: "Tuile lisse 1 × 2", w: 2, d: 1, h: 0.4, shape: "tile" },
  "tile-2x2": { name: "Tuile lisse 2 × 2", w: 2, d: 2, h: 0.4, shape: "tile" },
} as const;
export type PartType = keyof typeof CATALOG;
// Rendering and attachment must agree on the flat, studded part of each roof.
export function hasTopStud(type: PartType, row: number) {
  const part = CATALOG[type];
  return (
    part.shape !== "tile" && (part.shape !== "slope" || row === part.d - 1)
  );
}
export const COLORS = [
  "#f5f5f3",
  "#b9c2ca",
  "#58616c",
  "#252830",
  "#ef4444",
  "#ff882b",
  "#f8cc36",
  "#41a66b",
  "#29b8b2",
  "#4079e8",
  "#8b5bd6",
  "#ef85b0",
] as const;
export const COLOR_NAMES = [
  "Blanc",
  "Gris clair",
  "Gris foncé",
  "Noir",
  "Rouge",
  "Orange",
  "Jaune",
  "Vert",
  "Turquoise",
  "Bleu",
  "Violet",
  "Rose",
];
export type Vec3 = [number, number, number];
const vector = z.tuple([
  z.number().finite().min(-10000).max(10000),
  z.number().finite().min(-10000).max(10000),
  z.number().finite().min(-10000).max(10000),
]);
const base = {
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(100),
  parentId: z.string().nullable(),
  position: vector,
  rotation: vector,
  hidden: z.boolean(),
  locked: z.boolean(),
};
const nodeSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...base,
      kind: z.literal("part"),
      type: z.enum(Object.keys(CATALOG) as [PartType, ...PartType[]]),
      color: z.enum(COLORS),
    })
    .strict(),
  z.object({ ...base, kind: z.literal("group") }).strict(),
]);
export const sceneSchema = z
  .object({
    version: z.literal(1),
    catalog: z.literal("clik-1"),
    nodes: z.array(nodeSchema).max(1000),
  })
  .strict();
export type SceneDocument = z.infer<typeof sceneSchema>;
export type SceneNode = SceneDocument["nodes"][number];
export type Part = Extract<SceneNode, { kind: "part" }>;
export const emptyScene = (): SceneDocument => ({
  version: 1,
  catalog: "clik-1",
  nodes: [],
});
export function validateScene(value: unknown): SceneDocument {
  if (new TextEncoder().encode(JSON.stringify(value)).length > 512 * 1024)
    throw Error("La scène dépasse 512 Kio.");
  const scene = sceneSchema.parse(value);
  if (scene.nodes.filter((n) => n.kind === "part").length > 500)
    throw Error("Limite de 500 pièces atteinte.");
  const map = new Map(scene.nodes.map((n) => [n.id, n]));
  if (map.size !== scene.nodes.length) throw Error("Identifiants dupliqués.");
  for (const node of scene.nodes) {
    const seen = new Set([node.id]);
    let id = node.parentId;
    while (id) {
      const parent = map.get(id);
      if (!parent || parent.kind !== "group" || seen.has(id))
        throw Error("Hiérarchie invalide.");
      seen.add(id);
      id = parent.parentId;
    }
  }
  return scene;
}
export const matrix = (n: Pick<SceneNode, "position" | "rotation">) =>
  new Matrix4().compose(
    new Vector3(...n.position),
    new Quaternion().setFromEuler(new Euler(...n.rotation)),
    new Vector3(1, 1, 1),
  );
export function worldMatrix(scene: SceneDocument, id: string): Matrix4 {
  const n = scene.nodes.find((n) => n.id === id);
  if (!n) return new Matrix4();
  return n.parentId
    ? worldMatrix(scene, n.parentId).multiply(matrix(n))
    : matrix(n);
}
export function transform(m: Matrix4) {
  const p = new Vector3(),
    q = new Quaternion(),
    s = new Vector3();
  m.decompose(p, q, s);
  const e = new Euler().setFromQuaternion(q);
  return { position: p.toArray() as Vec3, rotation: [e.x, e.y, e.z] as Vec3 };
}
export function inherited(
  scene: SceneDocument,
  id: string,
  key: "hidden" | "locked",
): boolean {
  const n = scene.nodes.find((n) => n.id === id);
  return !!n && (n[key] || (!!n.parentId && inherited(scene, n.parentId, key)));
}
export function roots(scene: SceneDocument, ids: string[]) {
  const selected = new Set(ids);
  return scene.nodes
    .filter(
      (n) =>
        selected.has(n.id) &&
        !ancestors(scene, n.id).some((id) => selected.has(id)),
    )
    .map((n) => n.id);
}
export function ancestors(scene: SceneDocument, id: string): string[] {
  const n = scene.nodes.find((n) => n.id === id);
  return n?.parentId ? [n.parentId, ...ancestors(scene, n.parentId)] : [];
}
export function descendants(scene: SceneDocument, ids: string[]) {
  const selected = new Set(ids);
  const nodes = new Map(scene.nodes.map((n) => [n.id, n]));
  const included = new Map<string, boolean>();
  const contains = (n: SceneNode): boolean => {
    if (selected.has(n.id)) return true;
    if (included.has(n.id)) return included.get(n.id)!;
    const parent = n.parentId ? nodes.get(n.parentId) : undefined;
    const result = !!parent && contains(parent);
    included.set(n.id, result);
    return result;
  };
  return scene.nodes.filter(contains).map((n) => n.id);
}
export function reparent(
  scene: SceneDocument,
  ids: string[],
  parentId: string | null,
) {
  const next = structuredClone(scene);
  for (const id of roots(scene, ids)) {
    if (
      id === parentId ||
      (parentId && ancestors(scene, parentId).includes(id))
    )
      throw Error("Un groupe ne peut pas se contenir.");
    const n = next.nodes.find((n) => n.id === id)!;
    const local = (
      parentId ? worldMatrix(scene, parentId).invert() : new Matrix4()
    ).multiply(worldMatrix(scene, id));
    Object.assign(n, transform(local), { parentId });
  }
  return validateScene(next);
}
export function group(
  scene: SceneDocument,
  ids: string[],
  id: string = crypto.randomUUID(),
) {
  const chosen = roots(scene, ids);
  if (!chosen.length) return scene;
  const next = structuredClone(scene);
  next.nodes.push({
    id,
    name: "Nouveau groupe",
    kind: "group",
    parentId: null,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
  });
  return reparent(next, chosen, id);
}
export function ungroup(scene: SceneDocument, ids: string[]) {
  let next = structuredClone(scene);
  for (const id of ids) {
    const n = next.nodes.find((n) => n.id === id);
    if (n?.kind !== "group") continue;
    const children = next.nodes
      .filter((c) => c.parentId === id)
      .map((c) => c.id);
    next = reparent(next, children, n.parentId);
    next.nodes = next.nodes.map((c) =>
      children.includes(c.id)
        ? { ...c, hidden: c.hidden || n.hidden, locked: c.locked || n.locked }
        : c,
    );
    next.nodes = next.nodes.filter((c) => c.id !== id);
  }
  return next;
}
function partBounds(scene: SceneDocument, part: Part) {
  const { w, h, d } = CATALOG[part.type];
  return new Box3(
    new Vector3(-w / 2, 0, -d / 2),
    new Vector3(w / 2, h + 0.2, d / 2),
  ).applyMatrix4(worldMatrix(scene, part.id));
}

/** Keep an assembly rigid and at the same height, with a free space beside it. */
export function placeInFreeSpace(
  scene: SceneDocument,
  ids: string[],
  existing: SceneDocument,
) {
  scene = validateScene(scene);
  const moving = new Set(descendants(scene, ids));
  const bounds = new Box3();
  for (const n of scene.nodes) {
    if (n.kind === "part" && moving.has(n.id))
      bounds.union(partBounds(scene, n));
  }
  if (bounds.isEmpty()) return scene;
  // Hidden and locked pieces also occupy space. Include studs and rotated parents.
  const obstacles = existing.nodes
    .filter((n): n is Part => n.kind === "part")
    .map((n) => partBounds(existing, n));
  if (!obstacles.some((box) => bounds.intersectsBox(box))) return scene;

  const candidates: Vector3[] = [];
  for (const axis of ["x", "z"] as const) {
    for (const sign of [1, -1]) {
      let distance = 0;
      // Every jump passes at least one obstacle permanently along this axis.
      for (let attempt = 0; attempt <= obstacles.length; attempt++) {
        const offset = new Vector3();
        offset[axis] = sign * distance;
        const candidate = bounds.clone().translate(offset);
        const collisions = obstacles.filter((box) =>
          candidate.intersectsBox(box),
        );
        if (!collisions.length) {
          candidates.push(offset);
          break;
        }
        distance = Math.max(
          ...collisions.map((box) =>
            Math.ceil(
              sign > 0
                ? box.max[axis] - bounds.min[axis] + 1
                : bounds.max[axis] - box.min[axis] + 1,
            ),
          ),
        );
      }
    }
  }
  // Prefer the closest free side, with +X first for equal distances.
  candidates.sort((a, b) => a.lengthSq() - b.lengthSq());
  for (const offset of candidates) {
    const placed = applyDelta(
      scene,
      ids,
      new Matrix4().makeTranslation(...offset.toArray()),
    );
    try {
      return validateScene(placed);
    } catch {
      /* Try the other sides if this placement exceeds document limits. */
    }
  }
  throw Error(
    "Aucun emplacement libre dans les limites de la scène pour cet ajout.",
  );
}

export function duplicate(
  scene: SceneDocument,
  ids: string[],
  into: SceneDocument = scene,
) {
  const all = descendants(scene, roots(scene, ids)),
    map = new Map(all.map((id) => [id, crypto.randomUUID()]));
  const copies = scene.nodes
    .filter((n) => all.includes(n.id))
    .map((n) => ({
      ...structuredClone(n),
      id: map.get(n.id)!,
      parentId: (n.parentId && map.get(n.parentId)) || n.parentId,
    }));
  const copyIds = roots(scene, ids).map((id) => map.get(id)!);
  const combined = { ...into, nodes: [...into.nodes, ...copies] };
  return {
    scene: placeInFreeSpace(combined, copyIds, into),
    ids: copyIds,
  };
}
export function applyDelta(
  scene: SceneDocument,
  ids: string[],
  delta: Matrix4,
) {
  const next = { ...scene, nodes: [...scene.nodes] };
  for (const id of roots(scene, ids)) {
    const index = scene.nodes.findIndex((n) => n.id === id);
    const n = scene.nodes[index];
    const local = (
      n.parentId ? worldMatrix(scene, n.parentId).invert() : new Matrix4()
    )
      .multiply(delta)
      .multiply(worldMatrix(scene, id));
    next.nodes[index] = { ...n, ...transform(local) };
  }
  return next;
}
export function makePart(
  type: PartType,
  color: (typeof COLORS)[number],
  position: Vec3 = [0, 0, 0],
): Part {
  return {
    id: crypto.randomUUID(),
    kind: "part",
    type,
    color,
    name: CATALOG[type].name,
    parentId: null,
    position,
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
  };
}
/** Align a bottom corner with cell boundaries, rather than rounding the center.
 * At quarter turns, all footprint edges then lie on integer grid lines, even
 * when an odd number of studs requires a half-cell center coordinate.
 */
export function snapToGrid(part: Part): Part {
  const { w, d } = CATALOG[part.type];
  const corner = new Vector3(-w / 2, 0, -d / 2).applyEuler(
    new Euler(...part.rotation),
  );
  // Remove trigonometric noise at quarter turns without changing free rotations.
  const clean = (value: number) => Math.round(value * 1e10) / 1e10;
  return {
    ...part,
    position: [
      clean(Math.round(part.position[0] + corner.x) - corner.x),
      clean(Math.round(part.position[1] / 0.4) * 0.4),
      clean(Math.round(part.position[2] + corner.z) - corner.z),
    ],
  };
}

// Attachment frames are transformed with their bricks, including arbitrary rotations.
function anchors(n: Part, top: boolean) {
  const d = CATALOG[n.type],
    points: Vector3[] = [];
  for (let x = 0; x < d.w; x++)
    for (let z = 0; z < d.d; z++) {
      if (top && !hasTopStud(n.type, z)) continue;
      points.push(
        new Vector3(x - (d.w - 1) / 2, top ? d.h : 0, z - (d.d - 1) / 2),
      );
    }
  return points;
}
export type SnapResult = {
  part: Part;
  kind: "attachment" | "grid" | "none";
  targetId?: string;
  points: Vec3[];
  rotation: Vec3;
};
export function snapCandidate(
  scene: SceneDocument,
  part: Part,
  enabled: boolean,
): SnapResult {
  if (!enabled) return { part, kind: "none", points: [], rotation: [0, 0, 0] };
  const m = matrix(part),
    bottom = anchors(part, false).map((p) => p.applyMatrix4(m));
  let best = 0.7,
    result = part;
  let targetId: string | undefined;
  for (const target of scene.nodes) {
    if (
      target.kind !== "part" ||
      target.id === part.id ||
      inherited(scene, target.id, "hidden")
    )
      continue;
    const tm = worldMatrix(scene, target.id),
      tq = new Quaternion().setFromRotationMatrix(tm),
      pq = new Quaternion().setFromEuler(new Euler(...part.rotation));
    const normal = new Vector3(0, 1, 0).applyQuaternion(tq),
      pn = new Vector3(0, 1, 0).applyQuaternion(pq);
    if (normal.dot(pn) < 0.7) continue;
    for (const a of anchors(target, true).map((p) => p.applyMatrix4(tm)))
      for (let i = 0; i < bottom.length; i++) {
        const dist = a.distanceTo(bottom[i]);
        if (dist < best) {
          best = dist;
          targetId = target.id;
          let align = tq.clone(),
            angle = Infinity;
          for (let turn = 0; turn < 4; turn++) {
            const candidate = tq
              .clone()
              .multiply(
                new Quaternion().setFromAxisAngle(
                  new Vector3(0, 1, 0),
                  (turn * Math.PI) / 2,
                ),
              );
            const distance = candidate.angleTo(pq);
            if (distance < angle) {
              angle = distance;
              align = candidate;
            }
          }
          const local = anchors(part, false)[i].applyQuaternion(align),
            e = new Euler().setFromQuaternion(align);
          result = {
            ...part,
            position: a.clone().sub(local).toArray() as Vec3,
            rotation: [e.x, e.y, e.z],
          };
        }
      }
  }
  if (!targetId)
    return {
      part: snapToGrid(part),
      kind: "grid",
      points: [],
      rotation: [0, 0, 0],
    };
  const target = scene.nodes.find((n) => n.id === targetId) as Part;
  const tm = worldMatrix(scene, targetId);
  const bottoms = anchors(result, false).map((p) =>
    p.applyMatrix4(matrix(result)),
  );
  const points = anchors(target, true)
    .map((p) => p.applyMatrix4(tm))
    .filter((p) => bottoms.some((b) => b.distanceTo(p) < 0.001))
    .map((p) => p.toArray() as Vec3);
  return {
    part: result,
    kind: "attachment",
    targetId,
    points,
    rotation: transform(tm).rotation,
  };
}
export function snapPart(
  scene: SceneDocument,
  part: Part,
  enabled: boolean,
): Part {
  return snapCandidate(scene, part, enabled).part;
}

export type SelectionPreview = Omit<SnapResult, "part"> & {
  scene: SceneDocument;
  ids: string[];
};

/** Locked descendants cannot be carried indirectly by a selected group. */
export function movableRoots(scene: SceneDocument, ids: string[]) {
  return roots(scene, ids).filter(
    (id) =>
      !inherited(scene, id, "hidden") &&
      !descendants(scene, [id]).some((child) =>
        inherited(scene, child, "locked"),
      ),
  );
}

/** Snap a selection as a rigid assembly, never against its own children. */
export function previewSelection(
  scene: SceneDocument,
  ids: string[],
  enabled: boolean,
  referenceId?: string,
): SelectionPreview {
  const empty: SelectionPreview = {
    scene,
    ids,
    kind: "none",
    points: [],
    rotation: [0, 0, 0],
  };
  if (!enabled) return empty;
  const moving = new Set(descendants(scene, ids));
  const eligible = scene.nodes.filter(
    (n): n is Part =>
      n.kind === "part" &&
      moving.has(n.id) &&
      !inherited(scene, n.id, "hidden"),
  );
  const anchor = eligible.find((n) => n.id === referenceId) ?? eligible[0];
  if (!anchor) return empty;
  const original = worldMatrix(scene, anchor.id),
    world = { ...anchor, ...transform(original), parentId: null };
  const candidates = {
    ...scene,
    nodes: scene.nodes.filter((n) => !moving.has(n.id)),
  };
  const { part, ...metadata } = snapCandidate(candidates, world, true);
  return {
    ...metadata,
    ids,
    scene: applyDelta(
      scene,
      ids,
      matrix(part).multiply(original.clone().invert()),
    ),
  };
}

export function snapSelection(
  scene: SceneDocument,
  ids: string[],
  enabled: boolean,
) {
  return previewSelection(scene, ids, enabled).scene;
}
