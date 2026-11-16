import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Matrix4 } from "three";
import {
  emptyScene,
  group,
  makePart,
  validateScene,
  worldMatrix,
  type Part,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";
import {
  constructionStep,
  constructionTimeline,
  sceneAtConstructionStep,
} from "../src/lib/clik/construction-timeline";

const parts = () =>
  useEditor
    .getState()
    .scene.nodes.filter((node): node is Part => node.kind === "part");

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(10000);
  useEditor.getState().load(emptyScene(), "Construction");
});
afterEach(() => vi.restoreAllMocks());

describe("dates de pose", () => {
  it("date les poses validées, les duplications et collages, même si l’horloge recule", () => {
    const editor = useEditor.getState();
    editor.add("brick-1x1");
    expect(parts()[0].createdAt).toBe(10000);
    editor.duplicate();
    expect(parts().map((part) => part.createdAt)).toEqual([10000, 10001]);
    editor.copy();
    vi.mocked(Date.now).mockReturnValue(1000);
    editor.paste();
    expect(parts().map((part) => part.createdAt)).toEqual([
      10000, 10001, 10002,
    ]);
  });

  it("conserve les dates après déplacement, couleur, groupement, annulation et rétablissement", () => {
    const editor = useEditor.getState();
    editor.add("brick-1x1");
    const id = parts()[0].id;
    editor.nudge([3, 0, 0]);
    editor.setColor("#ef4444");
    editor.group();
    editor.ungroup();
    editor.patch(id, { createdAt: 500 });
    expect(parts()[0].createdAt).toBe(10000);
    editor.duplicate();
    const copy = structuredClone(parts()[1]);
    editor.undo();
    expect(parts()).toHaveLength(1);
    editor.redo();
    expect(parts()[1]).toEqual(copy);
    const saved = JSON.stringify(useEditor.getState().scene);
    editor.load(JSON.parse(saved), "Reprise");
    expect(JSON.stringify(useEditor.getState().scene)).toBe(saved);
  });

  it("date toutes les pièces d’un import à leur arrivée, sans changer les dates de sa source", () => {
    const source = {
      ...emptyScene(),
      nodes: [
        { ...makePart("brick-1x1", "#4079e8"), createdAt: 100 },
        { ...makePart("brick-1x1", "#4079e8", [4, 0, 0]), createdAt: 200 },
      ],
    };
    useEditor
      .getState()
      .importProject(source, {
        id: "import",
        title: "Source",
        receiptIds: [],
        sources: [],
      });
    expect(parts().map((part) => part.createdAt)).toEqual([10000, 10000]);
    expect(source.nodes.map((part) => part.createdAt)).toEqual([100, 200]);
  });

  it("ne date pas rétroactivement les anciennes pièces et ne sauvegarde pas les aperçus de geste", () => {
    const legacy = makePart("brick-1x1", "#4079e8");
    const editor = useEditor.getState();
    editor.load({ ...emptyScene(), nodes: [legacy] }, "Ancienne");
    editor.select(legacy.id);
    editor.begin();
    editor.preview(new Matrix4().makeTranslation(3, 0, 0));
    expect(parts()[0].createdAt).toBeUndefined();
    editor.cancel();
    expect(parts()[0]).toEqual(legacy);
    editor.add("brick-2x2");
    expect(parts().map((part) => part.createdAt)).toEqual([undefined, 10000]);
  });

  it("valide les timestamps côté scène en gardant le format historique compatible", () => {
    const part = makePart("brick-1x1", "#4079e8");
    expect(validateScene({ ...emptyScene(), nodes: [part] }).nodes[0]).toEqual(
      part,
    );
    for (const createdAt of [
      -1,
      0.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
      "123",
    ])
      expect(() =>
        validateScene({ ...emptyScene(), nodes: [{ ...part, createdAt }] }),
      ).toThrow();
    expect(
      validateScene({ ...emptyScene(), nodes: [{ ...part, createdAt: 0 }] })
        .nodes[0],
    ).toHaveProperty("createdAt", 0);
  });
});

describe("lecture de la construction", () => {
  it("ordonne les poses par date, synchronise les lots et raccourcit les longues pauses", () => {
    const part = makePart("brick-1x1", "#4079e8");
    const scene = {
      ...emptyScene(),
      nodes: [
        { ...part, id: "last", createdAt: 86400000 },
        { ...part, id: "first", createdAt: 1000 },
        { ...part, id: "same", createdAt: 1000 },
        { ...part, id: "next", createdAt: 1001 },
      ],
    };
    const timeline = constructionTimeline(scene);
    expect(timeline.steps).toEqual([
      { at: 500, ids: ["first", "same"] },
      { at: 800, ids: ["next"] },
      { at: 2300, ids: ["last"] },
    ]);
    expect(timeline.duration).toBe(3100);
    for (const [time, count] of [
      [0, 0],
      [499, 0],
      [500, 2],
      [799, 2],
      [800, 3],
      [2300, 4],
    ]) {
      const preview = sceneAtConstructionStep(
        scene,
        timeline,
        constructionStep(timeline, time),
      );
      expect(preview.nodes).toHaveLength(count);
    }
    expect(sceneAtConstructionStep(scene, timeline, 3)).toBe(scene);
    expect(scene.nodes).toHaveLength(4);
  });

  it("conserve les groupes, les pièces masquées et les transformations mondiales à chaque étape", () => {
    const a = {
      ...makePart("brick-1x1", "#4079e8", [2, 3, 4]),
      createdAt: 1000,
    };
    const b = {
      ...makePart("brick-2x2", "#4079e8"),
      hidden: true,
      createdAt: 2000,
    };
    const scene = group(
      { ...emptyScene(), nodes: [a, b] },
      [a.id, b.id],
      "group",
    );
    scene.nodes.find((node) => node.id === "group")!.rotation = [0, 0.8, 0];
    const preview = sceneAtConstructionStep(
      scene,
      constructionTimeline(scene),
      1,
    );
    expect(validateScene(preview)).toEqual(preview);
    expect(preview.nodes.map((node) => node.id)).toEqual([a.id, "group"]);
    expect(worldMatrix(preview, a.id)).toEqual(worldMatrix(scene, a.id));
    expect(
      sceneAtConstructionStep(scene, constructionTimeline(scene), 2).nodes.find(
        (node) => node.id === b.id,
      )?.hidden,
    ).toBe(true);
  });

  it("garde les pièces non datées comme base et masque le lecteur pour les anciennes scènes", () => {
    const legacy = makePart("brick-1x1", "#4079e8");
    const scene = { ...emptyScene(), nodes: [legacy] };
    expect(constructionTimeline(scene).duration).toBe(0);
    expect(constructionTimeline(emptyScene()).duration).toBe(0);
    scene.nodes.push({ ...makePart("brick-2x2", "#4079e8"), createdAt: 1000 });
    const timeline = constructionTimeline(scene);
    expect(timeline.baseline).toBe(1);
    expect(timeline.total).toBe(2);
    expect(sceneAtConstructionStep(scene, timeline, 0).nodes).toEqual([legacy]);
  });
});
