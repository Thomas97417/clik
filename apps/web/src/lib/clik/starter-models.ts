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
    description: "Un toit, quatre murs. Et tout à inventer autour.",
    color: "#ef4444",
  },
  {
    id: "robot",
    name: "Le robot curieux",
    label: "Robot",
    description: "Un compagnon qui ne ressemble qu’à vous.",
    color: "#4079e8",
  },
  {
    id: "bridge",
    name: "Le pont des possibles",
    label: "Pont",
    description: "Reliez les deux rives de votre imagination.",
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
  if (id === "house") {
    for (const x of [-2, 2])
      for (const z of [-2, 2]) add("plate-4x4", "#41a66b", [x, 0, z]);
    for (const y of [0.4, 1.6, 2.8]) {
      add("brick-1x4", "#f8cc36", [0, y, -1.5]);
      for (const x of [-1.5, 1.5]) {
        add(
          "brick-1x2",
          y === 1.6 ? "#29b8b2" : "#f8cc36",
          [x, y, 0],
          [0, Math.PI / 2, 0],
        );
        if (y < 2.8) add("brick-1x1", "#f8cc36", [x, y, 1.5]);
      }
    }
    add("brick-1x4", "#f8cc36", [0, 2.8, 1.5]);
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        add("slope-2x2", accent, [x, 4, z], [0, z > 0 ? Math.PI : 0, 0]);
    add("brick-1x1", "#f5f5f3", [-0.5, 5.2, 0.5]);
    add("tile-2x2", "#f5f5f3", [0, 0.4, 3]);
    for (const x of [-3, 3]) {
      add("brick-1x1", "#f8cc36", [x, 0.4, -2]);
      add("brick-2x2", "#41a66b", [x, 1.6, -2]);
    }
  } else if (id === "robot") {
    for (const x of [-1, 1]) {
      add("plate-2x2", accent, [x, 0, 0]);
      add("brick-1x1", "#f5f5f3", [x, 0.4, 0]);
    }
    for (const y of [1.6, 2.8]) {
      add("brick-2x4", accent, [0, y, 0]);
      for (const x of [-2.5, 2.5]) add("brick-1x1", "#f8cc36", [x, y, 0]);
    }
    add("brick-2x4", "#f5f5f3", [0, 4, 0]);
    add("plate-2x4", accent, [0, 5.2, 0]);
    add("brick-1x1", "#f8cc36", [0, 5.6, 0]);
    for (const x of [-1, 1])
      add("tile-1x1", "#252830", [x, 4.6, 1.4], [Math.PI / 2, 0, 0]);
    add("tile-1x1", "#f8cc36", [0, 2.8, 1.4], [Math.PI / 2, 0, 0]);
  } else {
    for (const x of [-3, 3]) {
      add("plate-4x4", "#29b8b2", [x, 0, 0]);
      for (const y of [0.4, 1.6, 2.8]) add("brick-2x2", "#f5f5f3", [x, y, 0]);
    }
    for (const x of [-3, -1, 1, 3])
      add("plate-2x4", accent, [x, 4, 0], [0, Math.PI / 2, 0]);
    for (const z of [-1.5, 1.5]) {
      for (const x of [-3.5, 3.5]) add("brick-1x1", "#f8cc36", [x, 4.4, z]);
      add("brick-1x6", accent, [0, 4.4, z]);
    }
  }
  return scene;
}
