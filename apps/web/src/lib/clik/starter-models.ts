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
    id: "lighthouse",
    name: "Le phare des marées",
    label: "Phare",
    description:
      "Une tour rayée, sa lanterne, la maison du gardien et un ponton sur les flots.",
    color: "#4079e8",
  },
  {
    id: "castle",
    name: "Le château des horizons",
    label: "Château",
    description:
      "Quatre tours, un donjon, des remparts et une cour à explorer au-delà des douves.",
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
  } else if (id === "lighthouse") {
    // A coastal diorama: rocky terraces, a hollow striped tower and a keeper's house.
    for (const x of [-4, 4])
      for (const z of [-4, 4]) add("plate-8x8", water, [x, 0, z]);
    add("plate-8x8", dark, [-2, 0.4, -1]);
    add("plate-6x6", stone, [-2, 0.8, -1]);
    add("plate-4x4", stone, [4, 0.4, 2]);
    const tx = -3,
      tz = -2;
    for (let level = 0; level < 8; level++) {
      const y = 1.2 + level * 1.2;
      const wall = level % 3 === 1 ? accent : white;
      add("brick-1x4", wall, [tx, y, tz - 1.5]);
      if (level === 2 || level === 5) {
        add("brick-1x2", water, [tx, y, tz + 1.5]);
        for (const dx of [-1.5, 1.5])
          add("brick-1x1", wall, [tx + dx, y, tz + 1.5]);
      } else add("brick-1x4", wall, [tx, y, tz + 1.5]);
      for (const dx of [-1.5, 1.5])
        add("brick-1x2", wall, [tx + dx, y, tz], [0, quarter, 0]);
    }
    add("plate-6x6", dark, [tx, 10.8, tz]);
    for (const dx of [-2.5, 2.5])
      for (const dz of [-2.5, -0.5, 2.5]) {
        add("round-brick-1x1", white, [tx + dx, 11.2, tz + dz]);
        add("round-tile-1x1", accent, [tx + dx, 12.4, tz + dz]);
      }
    for (const dz of [-2.5, 2.5]) {
      add("round-brick-1x1", white, [tx - 0.5, 11.2, tz + dz]);
      add("round-tile-1x1", accent, [tx - 0.5, 12.4, tz + dz]);
    }
    add("plate-4x4", accent, [tx, 11.2, tz]);
    for (const dz of [-1.5, 1.5]) {
      add("brick-1x2", gold, [tx, 11.6, tz + dz]);
      for (const dx of [-1.5, 1.5])
        add("brick-1x1", dark, [tx + dx, 11.6, tz + dz]);
    }
    for (const dx of [-1.5, 1.5])
      add("brick-1x2", gold, [tx + dx, 11.6, tz], [0, quarter, 0]);
    add("plate-4x4", dark, [tx, 12.8, tz]);
    for (const dx of [-1, 1])
      for (const dz of [-1, 1])
        add(
          "slope-2x2",
          accent,
          [tx + dx, 13.2, tz + dz],
          [0, dz > 0 ? Math.PI : 0, 0],
        );
    add("round-brick-1x1", dark, [tx - 0.5, 14.4, tz - 0.5]);
    add("round-tile-1x1", gold, [tx - 0.5, 15.6, tz - 0.5]);
    // The smaller building and dock give the tower a readable sense of scale.
    for (const y of [0.8, 2]) {
      add("brick-1x4", white, [4, y, 0.5]);
      add("brick-1x2", y === 0.8 ? dark : water, [4, y, 3.5]);
      for (const x of [2.5, 5.5]) {
        add("brick-1x1", white, [x, y, 3.5]);
        add("brick-1x2", white, [x, y, 2], [0, quarter, 0]);
      }
    }
    add("plate-4x6", dark, [4, 3.2, 2]);
    for (const x of [2.5, 5.5])
      for (const z of [1, 3])
        add("slope-2x3", accent, [x, 3.6, z], [0, z > 2 ? Math.PI : 0, 0]);
    add("brick-1x1", dark, [5.5, 4.8, 1.5]);
    add("tile-1x1", stone, [5.5, 6, 1.5]);
    for (const y of [0.8, 1.2]) add("plate-1x2", stone, [0, y, 2.5]);
    for (const z of [4, 6]) {
      for (const x of [-1.5, 1.5]) add("round-brick-1x1", dark, [x, 0.4, z]);
      for (const dz of [-0.5, 0.5]) add("tile-1x4", stone, [0, 1.6, z + dz]);
    }
    for (const x of [-1.5, 1.5]) {
      add("round-brick-1x1", white, [x, 2, 6.5]);
      add("round-tile-1x1", gold, [x, 3.2, 6.5]);
    }
    for (const [x, z] of [
      [-7, -5],
      [-6, 5],
      [5, -5],
      [6, 6],
    ]) {
      add("round-plate-2x2", stone, [x, 0.4, z]);
      add("round-tile-1x1", dark, [x, 0.8, z]);
    }
    for (const [x, z] of [
      [0, -6.5],
      [4, -3.5],
      [-3, 7.5],
      [4, 7.5],
    ])
      add("tile-1x3", white, [x, 0.4, z]);
    for (const z of [-1.5, -0.5, 0.5]) add("tile-1x2", stone, [0, 1.2, z]);
    tree(4.5, -1.5, 0.4);
  } else {
    // Four hollow corner towers enclose a courtyard and a taller central keep.
    for (const x of [-8, 0, 8]) {
      for (const z of [-4, 4]) add("plate-8x8", green, [x, 0, z]);
      add("plate-2x8", water, [x, 0, 9]);
      add("plate-2x8", green, [x, 0, 11]);
    }
    const flag = (x: number, y: number, z: number) => {
      add("round-brick-1x1", dark, [x, y, z]);
      add("tile-1x2", accent, [x + 1, y + 0.7, z + 0.5], [quarter, 0, 0]);
      add("round-tile-1x1", gold, [x, y + 1.2, z]);
    };
    for (const x of [-8, 8])
      for (const z of [-4, 4]) {
        for (let level = 0; level < 6; level++) {
          const y = 0.4 + level * 1.2;
          add("brick-1x4", level === 1 ? stone : white, [x, y, z - 1.5]);
          if (level === 2 || level === 4) {
            add("brick-1x2", water, [x, y, z + 1.5]);
            for (const dx of [-1.5, 1.5])
              add("brick-1x1", white, [x + dx, y, z + 1.5]);
          } else add("brick-1x4", level === 1 ? stone : white, [x, y, z + 1.5]);
          for (const dx of [-1.5, 1.5])
            add(
              "brick-1x2",
              level === 1 ? stone : white,
              [x + dx, y, z],
              [0, quarter, 0],
            );
        }
        add("plate-4x4", dark, [x, 7.6, z]);
        for (const dx of [-1, 1])
          for (const dz of [-1, 1])
            add(
              "slope-steep-2x2",
              accent,
              [x + dx, 8, z + dz],
              [0, dz > 0 ? Math.PI : 0, 0],
            );
        add("plate-2x2", accent, [x, 10.4, z]);
        flag(x - 0.5, 10.8, z - 0.5);
      }
    for (const y of [0.4, 1.6, 2.8, 4]) {
      for (const x of [-8, 8])
        add("brick-1x4", stone, [x, y, 0], [0, quarter, 0]);
      for (const x of [-3, 3]) add("brick-1x6", stone, [x, y, -4]);
    }
    for (const x of [-8, 8]) {
      add("plate-1x4", white, [x, 5.2, 0], [0, quarter, 0]);
      for (const z of [-1.5, 1.5]) add("brick-1x1", white, [x, 5.6, z]);
    }
    for (const x of [-3, 3]) {
      add("plate-1x6", white, [x, 5.2, -4]);
      add("plate-1x6", white, [x, 4, 4]);
    }
    for (const x of [-5.5, -3.5, -1.5, 1.5, 3.5, 5.5]) {
      add("brick-1x1", white, [x, 5.6, -4]);
      add("brick-1x1", white, [x, 4.4, 4]);
    }
    for (const x of [-4.5, 4.5])
      for (const y of [0.4, 1.6, 2.8]) add("brick-1x3", stone, [x, y, 4]);
    add("arch-1x6x3", white, [0, 0.4, 4]);
    // The keep has an open doorway and two rows of coloured windows.
    for (let level = 0; level < 8; level++) {
      const y = 0.4 + level * 1.2;
      add("brick-1x6", white, [0, y, -2.5]);
      for (const x of [-2.5, 2.5])
        add("brick-1x2", white, [x, y, -1], [0, quarter, 0]);
      if (level === 3 || level === 5) {
        add("brick-1x2", water, [0, y, 0.5]);
        for (const x of [-2, 2]) add("brick-1x2", white, [x, y, 0.5]);
      } else if (level >= 3) add("brick-1x6", white, [0, y, 0.5]);
    }
    add("arch-1x6x3", white, [0, 0.4, 0.5]);
    add("plate-4x6", dark, [0, 10, -1]);
    for (const x of [-2, 0, 2])
      for (const z of [-2, 0])
        add(
          "slope-steep-2x2",
          accent,
          [x, 10.4, z],
          [0, z === 0 ? Math.PI : 0, 0],
        );
    flag(-0.5, 12.8, -1.5);
    for (const z of [2, 4]) add("tile-2x2", stone, [0, 0.4, z]);
    add("tile-1x4", stone, [0, 0.4, 5.5]);
    for (const x of [-10, -6, -2, 2, 6, 10])
      add("tile-2x4", water, [x, 0.4, 9]);
    for (const z of [6.5, 7.5, 8.5, 9.5, 10.5])
      add("tile-1x4", dark, [0, 0.8, z]);
    for (const x of [-1.5, 1.5]) {
      for (const z of [6.5, 10.5]) {
        add("round-brick-1x1", white, [x, 1.2, z]);
        add("round-tile-1x1", gold, [x, 2.8, z]);
      }
      add("tile-1x6", accent, [x, 2.4, 8.5], [0, quarter, 0]);
    }
    add("round-plate-3x3", stone, [-4.5, 0.4, 0]);
    add("round-tile-2x2", water, [-4.5, 0.8, 0]);
    add("round-brick-1x1", white, [-4.5, 1.2, 0]);
    add("round-plate-2x2", water, [-4.5, 2.4, 0]);
    add("round-tile-1x1", gold, [-4.5, 2.8, 0]);
    tree(4.5, 0);
    for (const x of [-10.5, 10.5]) tree(x, 11);
  }
  return scene;
}
