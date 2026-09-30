import {
  CATALOG,
  emptyScene,
  type Part,
  type PartType,
  type SceneDocument,
  type Vec3,
} from "@clik/scene";

export const STARTER_MODELS = [
  {
    id: "house",
    name: "La petite maison",
    label: "Maison",
    description:
      "Une entrée en arche, un toit en pente et un jardin à faire grandir.",
    color: "#ef4444",
  },
  {
    id: "robot",
    name: "Le robot curieux",
    label: "Robot",
    description:
      "Des yeux ronds, une antenne et une armure : prêt pour sa prochaine mission.",
    color: "#4079e8",
  },
  {
    id: "bridge",
    name: "Le pont des possibles",
    label: "Pont",
    description: "Deux arches, des berges plantées et une rivière à enjamber.",
    color: "#8b5bd6",
  },
] as const;
export type StarterId = (typeof STARTER_MODELS)[number]["id"];
export const STARTER_COLORS = [
  { value: "#ef4444", name: "Rouge" },
  { value: "#ff882b", name: "Orange" },
  { value: "#41a66b", name: "Vert" },
  { value: "#4079e8", name: "Bleu" },
  { value: "#8b5bd6", name: "Violet" },
] as const;
export type StarterColor = (typeof STARTER_COLORS)[number]["value"];

/** Deterministic IDs keep server markup and cached previews stable. */
export function starterScene(
  id: StarterId,
  accent: StarterColor,
): SceneDocument {
  const scene = emptyScene();
  const add = (
    type: PartType,
    color: Part["color"],
    position: Vec3,
    rotation: Vec3 = [0, 0, 0],
  ) => {
    scene.nodes.push({
      id: `starter-${id}-${scene.nodes.length}`,
      kind: "part",
      name: CATALOG[type].name,
      type,
      color,
      position,
      rotation,
      parentId: null,
      hidden: false,
      locked: false,
    });
  };
  const white = "#f5f5f3";
  const stone = "#b9c2ca";
  const dark = "#58616c";
  const green = "#41a66b";
  const water = "#29b8b2";
  const gold = "#f8cc36";
  const quarter = Math.PI / 2;
  const tree = (x: number, z: number, floor = 0.4) => {
    add("round-brick-1x1", dark, [x, floor, z]);
    add("round-plate-3x3", green, [x, floor + 1.2, z]);
    add("round-brick-1x1", green, [x, floor + 1.6, z]);
    add("round-plate-2x2", green, [x, floor + 2.8, z]);
    add("round-tile-1x1", gold, [x, floor + 3.2, z]);
  };
  if (id === "house") {
    // A tiled garden and a hollow cottage with a real arched entrance.
    for (const x of [-3, 3])
      for (const z of [-3, 3]) add("plate-6x6", green, [x, 0, z]);
    for (const z of [3, 5]) add("tile-2x2", stone, [0, 0.4, z]);
    add("plate-4x4", white, [0, 0.4, -1]);
    for (const y of [0.4, 1.6, 2.8]) {
      add("brick-1x6", white, [0, y, -3.5]);
      for (const x of [-2.5, 2.5]) {
        if (y === 1.6) {
          add("brick-1x2", water, [x, y, -1], [0, quarter, 0]);
          for (const z of [-2.5, 0.5]) add("brick-1x1", white, [x, y, z]);
        } else add("brick-1x4", white, [x, y, -1], [0, quarter, 0]);
      }
    }
    add("arch-1x6x3", white, [0, 0.4, 1.5]);
    for (const z of [-3, -1, 1]) add("plate-2x8", dark, [0, 4, z]);
    for (const x of [-3, -1, 1, 3])
      for (const z of [-2.5, 0.5])
        add("slope-3x2", accent, [x, 4.4, z], [0, z > -1 ? Math.PI : 0, 0]);
    add("brick-1x1", dark, [2.5, 5.6, -1.5]);
    add("tile-1x1", stone, [2.5, 6.8, -1.5]);
    // Window boxes, two trees, flower beds and a low garden fence.
    for (const x of [-3.5, 3.5]) {
      add("plate-1x2", accent, [x, 0.8, -1], [0, quarter, 0]);
      for (const z of [-1.5, -0.5]) add("round-plate-1x1", gold, [x, 1.2, z]);
    }
    for (const x of [-4.5, 4.5]) tree(x, -3.5);
    for (const x of [-3, 3]) {
      add("round-plate-3x3", dark, [x, 0.4, 3.5]);
      for (const dx of [-0.75, 0.75]) {
        add("round-brick-1x1", green, [x + dx, 0.8, 3.5]);
        add("round-plate-1x1", accent, [x + dx, 2, 3.5]);
        add("round-tile-1x1", gold, [x + dx, 2.4, 3.5]);
      }
    }
    for (const side of [-1, 1]) {
      for (const x of [3.5, 5.5])
        add("round-brick-1x1", white, [side * x, 0.4, 5.5]);
      add("tile-1x3", white, [side * 4.5, 1.6, 5.5]);
    }
  } else if (id === "robot") {
    // A display plinth, shaped boots and a robot assembled around round joints.
    add("round-plate-8x8", dark, [0, 0, 0]);
    for (const x of [-1.5, 1.5]) {
      add("plate-2x3", stone, [x, 0.4, 0.5], [0, quarter, 0]);
      add("slope-2x2", accent, [x, 0.8, 0.5], [0, Math.PI, 0]);
      add("round-brick-1x1", dark, [x, 2, 0]);
      add("round-tile-1x1", gold, [x, 2.6, 0.5], [quarter, 0, 0]);
    }
    add("plate-2x6", stone, [0, 3.2, 0]);
    for (const y of [3.6, 4.8]) {
      add("brick-2x4", accent, [0, y, 0]);
      for (const x of [-2.5, 2.5]) add("round-brick-1x1", dark, [x, y, 0]);
      for (const x of [-3.5, 3.5])
        add("brick-1x1", y === 4.8 ? accent : white, [x, y, 0]);
    }
    for (const x of [-3.5, 3.5]) {
      add("round-plate-1x1", dark, [x, 3.2, 0]);
      add("round-tile-1x1", gold, [x, 5.4, 0.5], [quarter, 0, 0]);
    }
    add("round-tile-2x2", white, [0, 4.8, 1], [quarter, 0, 0]);
    add("round-tile-1x1", gold, [0, 4.8, 1.4], [quarter, 0, 0]);
    add("plate-2x4", stone, [0, 6, 0]);
    add("round-plate-2x2", dark, [0, 6.4, 0]);
    for (const y of [6.8, 8]) add("brick-2x4", white, [0, y, 0]);
    add("tile-2x4", "#252830", [0, 8, 1], [quarter, 0, 0]);
    for (const x of [-1, 1]) {
      add("round-tile-2x2", stone, [x, 8, 1.4], [quarter, 0, 0]);
      add("round-tile-1x1", water, [x, 8, 1.8], [quarter, 0, 0]);
    }
    for (const side of [-1, 1]) {
      add("round-plate-2x2", accent, [side * 2, 8, 0], [0, 0, -side * quarter]);
      add("round-tile-1x1", dark, [side * 2.4, 8, 0], [0, 0, -side * quarter]);
    }
    add("plate-2x4", accent, [0, 9.2, 0]);
    for (const x of [-1, 1]) add("slope-2x2", accent, [x, 9.6, 0]);
    add("round-brick-1x1", dark, [-0.5, 10.8, 0.5]);
    add("round-tile-1x1", gold, [-0.5, 12, 0.5]);
    // Small lights around the platform make it feel like a charging station.
    for (const x of [-2.5, 2.5])
      for (const z of [-2.5]) add("round-tile-1x1", accent, [x, 0.4, z]);
    for (const x of [-0.5, 0.5]) add("tile-1x1", gold, [x, 0.4, 3]);
  } else {
    // Two actual arches support a tiled deck over a broad river.
    for (const x of [-6, -2, 2, 6])
      for (const z of [-4, 0, 4])
        add("plate-4x4", Math.abs(x) === 6 ? green : water, [x, 0, z]);
    for (const x of [-2, 2])
      for (const z of [-4, 4]) add("tile-4x4", water, [x, 0.4, z]);
    for (const x of [-3, 3]) {
      for (const z of [-1.5, 1.5]) add("arch-1x6x3", white, [x, 0.4, z]);
      add("plate-4x6", stone, [x, 4, 0]);
      for (const z of [-1.5, 1.5]) add("tile-1x6", accent, [x, 6, z]);
    }
    for (const x of [-5, -3, -1, 1, 3, 5])
      for (const z of [-1.5, -0.5, 0.5, 1.5])
        add("tile-1x2", stone, [x, 4.4, z]);
    for (const x of [-5.5, -3.5, -1.5, 1.5, 3.5, 5.5])
      for (const z of [-1.5, 1.5]) {
        add("round-brick-1x1", white, [x, 4.8, z]);
        add("round-tile-1x1", gold, [x, 6.4, z]);
      }
    for (const x of [-6, 6]) for (const z of [-4, 4]) tree(x, z);
    for (const x of [-2.5, 2.5])
      for (const z of [-4.5, 4.5]) add("round-tile-2x2", stone, [x, 0.8, z]);
  }
  return scene;
}
