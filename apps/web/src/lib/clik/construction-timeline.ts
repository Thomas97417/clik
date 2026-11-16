import type { Part, SceneDocument } from "@clik/scene";

/** Stamp committed additions, including copies/imports, never transient previews. */
export function timestampNewParts(
  previous: SceneDocument,
  next: SceneDocument,
  now = Date.now(),
): SceneDocument {
  const parts = new Map(
    previous.nodes
      .filter((node): node is Part => node.kind === "part")
      .map((part) => [part.id, part]),
  );
  // Keep distinct commits ordered even within a millisecond or after a clock change.
  const timestamp = Math.max(
    now,
    ...[...parts.values()].map((part) =>
      part.createdAt === undefined ? 0 : part.createdAt + 1,
    ),
  );
  const nodes = next.nodes.map((node) => {
    if (node.kind !== "part") return node;
    const existing = parts.get(node.id);
    const createdAt = existing ? existing.createdAt : timestamp;
    if (node.createdAt === createdAt) return node;
    if (createdAt !== undefined) return { ...node, createdAt };
    const { createdAt: _createdAt, ...undated } = node;
    return undated;
  });
  return nodes.every((node, index) => node === next.nodes[index])
    ? next
    : { ...next, nodes };
}

export type ConstructionTimeline = {
  steps: { at: number; ids: string[] }[];
  duration: number;
  baseline: number;
  total: number;
};

export function constructionTimeline(
  scene: SceneDocument,
): ConstructionTimeline {
  const batches = new Map<number, string[]>();
  let baseline = 0;
  for (const node of scene.nodes) {
    if (node.kind !== "part") continue;
    if (node.createdAt === undefined) baseline++;
    else {
      const ids = batches.get(node.createdAt) ?? [];
      ids.push(node.id);
      batches.set(node.createdAt, ids);
    }
  }
  let at = 0;
  let previous: number | undefined;
  const steps = [...batches]
    .sort(([a], [b]) => a - b)
    .map(([stamp, ids]) => {
      // Retain the rhythm of placement without replaying hours of inactivity.
      at +=
        previous === undefined
          ? 500
          : Math.max(300, Math.min(1500, stamp - previous));
      previous = stamp;
      return { at, ids };
    });
  return {
    steps,
    duration: steps.length ? at + 800 : 0,
    baseline,
    total:
      baseline +
      [...batches.values()].reduce((sum, ids) => sum + ids.length, 0),
  };
}

export function constructionStep(timeline: ConstructionTimeline, time: number) {
  let index = 0;
  while (index < timeline.steps.length && timeline.steps[index].at <= time)
    index++;
  return index;
}

/** Retain groups and local transforms so nested pieces stay in their final place. */
export function sceneAtConstructionStep(
  scene: SceneDocument,
  timeline: ConstructionTimeline,
  step: number,
): SceneDocument {
  if (step >= timeline.steps.length) return scene;
  const pending = new Set(
    timeline.steps.slice(step).flatMap((batch) => batch.ids),
  );
  return {
    ...scene,
    nodes: scene.nodes.filter((node) => !pending.has(node.id)),
  };
}

export function playbackTime(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
