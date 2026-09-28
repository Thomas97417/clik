import { z } from "zod";
import { Matrix4, Quaternion, Vector3, Euler } from "three";
export const CATALOG = {
  "brick-1x1": { name: "Brique 1 × 1", w: 1, d: 1, h: 1.2 },
  "brick-1x2": { name: "Brique 1 × 2", w: 2, d: 1, h: 1.2 },
  "brick-1x4": { name: "Brique 1 × 4", w: 4, d: 1, h: 1.2 },
  "brick-2x2": { name: "Brique 2 × 2", w: 2, d: 2, h: 1.2 },
  "brick-2x3": { name: "Brique 2 × 3", w: 3, d: 2, h: 1.2 },
  "brick-2x4": { name: "Brique 2 × 4", w: 4, d: 2, h: 1.2 },
  "plate-1x2": { name: "Plaque 1 × 2", w: 2, d: 1, h: 0.4 },
  "plate-2x2": { name: "Plaque 2 × 2", w: 2, d: 2, h: 0.4 },
  "plate-2x4": { name: "Plaque 2 × 4", w: 4, d: 2, h: 0.4 },
  "slope-2x2": { name: "Pente 2 × 2", w: 2, d: 2, h: 1.2 },
} as const;
export type PartType = keyof typeof CATALOG;
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
  return scene.nodes
    .filter(
      (n) =>
        ids.includes(n.id) ||
        ancestors(scene, n.id).some((id) => ids.includes(id)),
    )
    .map((n) => n.id);
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
  return {
    scene: validateScene({ ...into, nodes: [...into.nodes, ...copies] }),
    ids: roots(scene, ids).map((id) => map.get(id)!),
  };
}
export function applyDelta(
  scene: SceneDocument,
  ids: string[],
  delta: Matrix4,
) {
  const next = structuredClone(scene);
  for (const id of roots(scene, ids)) {
    const n = next.nodes.find((n) => n.id === id)!;
    const local = (
      n.parentId ? worldMatrix(scene, n.parentId).invert() : new Matrix4()
    )
      .multiply(delta)
      .multiply(worldMatrix(scene, id));
    Object.assign(n, transform(local));
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
// Attachment frames are transformed with their bricks, including arbitrary rotations.
function anchors(n: Part, top: boolean) {
  const d = CATALOG[n.type],
    points: Vector3[] = [];
  for (let x = 0; x < d.w; x++)
    for (let z = 0; z < d.d; z++) {
      if (top && n.type === "slope-2x2" && z === 0) continue;
      points.push(
        new Vector3(x - (d.w - 1) / 2, top ? d.h : 0, z - (d.d - 1) / 2),
      );
    }
  return points;
}
export function snapPart(
  scene: SceneDocument,
  part: Part,
  enabled: boolean,
): Part {
  if (!enabled) return part;
  const m = matrix(part),
    bottom = anchors(part, false).map((p) => p.applyMatrix4(m));
  let best = 0.7,
    result = part;
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
  return result === part
    ? {
        ...part,
        position: [
          Math.round(part.position[0]),
          Math.round(part.position[1] / 0.4) * 0.4,
          Math.round(part.position[2]),
        ],
      }
    : result;
}

/** Snap a selection as a rigid assembly, never against its own children. */
export function snapSelection(
  scene: SceneDocument,
  ids: string[],
  enabled: boolean,
) {
  if (!enabled) return scene;
  const moving = new Set(descendants(scene, ids));
  const anchor = scene.nodes.find(
    (n): n is Part =>
      n.kind === "part" &&
      moving.has(n.id) &&
      !inherited(scene, n.id, "hidden"),
  );
  if (!anchor) return scene;
  const original = worldMatrix(scene, anchor.id),
    world = { ...anchor, ...transform(original), parentId: null };
  const candidates = {
    ...scene,
    nodes: scene.nodes.filter((n) => !moving.has(n.id)),
  };
  const snapped = snapPart(candidates, world, true);
  return applyDelta(
    scene,
    ids,
    matrix(snapped).multiply(original.clone().invert()),
  );
}
