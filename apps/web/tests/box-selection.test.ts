import { describe, expect, it } from "vitest";
import { OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import { emptyScene, group, makePart, worldMatrix } from "@clik/scene";
import {
  partsInsideBox,
  projectSelectionBounds,
} from "../src/lib/clik/box-selection";
import { useEditor } from "../src/lib/clik/store";

const full = { left: 0, top: 0, width: 800, height: 600 };
function frontCamera() {
  const camera = new PerspectiveCamera(40, 800 / 600, 0.1, 100);
  camera.position.set(0, 1, 20);
  camera.lookAt(0, 1, 0);
  return camera;
}

describe("Sélection par cadre", () => {
  it("inclut les pièces occultées et exclut les pièces masquées, même par leur groupe", () => {
    const front = makePart("brick-2x2", "#4079e8");
    const back = makePart("brick-1x1", "#ef4444", [0, 0, -5]);
    const hidden = { ...makePart("brick-1x1", "#ef4444"), hidden: true };
    const child = makePart("brick-1x1", "#ef4444");
    const scene = group(
      { ...emptyScene(), nodes: [front, back, hidden, child] },
      [child.id],
      "hidden-group",
    );
    scene.nodes.find((node) => node.id === "hidden-group")!.hidden = true;
    const bounds = projectSelectionBounds(scene, frontCamera(), 800, 600);
    expect(partsInsideBox(bounds, full)).toEqual([front.id, back.id]);
    expect(
      partsInsideBox(
        bounds,
        bounds.find((part) => part.id === front.id)!,
      ),
    ).toEqual([front.id, back.id]);
  });

  it("exige que toute la pièce soit à l’intérieur, pas uniquement son centre", () => {
    const part = makePart("brick-2x4", "#4079e8");
    const bounds = projectSelectionBounds(
      { ...emptyScene(), nodes: [part] },
      frontCamera(),
      800,
      600,
    );
    const rect = bounds[0];
    expect(
      partsInsideBox(bounds, {
        ...rect,
        left: rect.left + 1,
        width: rect.width - 2,
      }),
    ).toEqual([]);
    expect(partsInsideBox(bounds, rect)).toEqual([part.id]);
  });

  it("utilise la forme ronde réelle plutôt que les coins vides d’une boîte englobante", () => {
    const camera = new OrthographicCamera(-10, 10, 7.5, -7.5, 0.1, 100);
    camera.position.set(20, 1, 20);
    camera.lookAt(0, 1, 0);
    const part = makePart("round-brick-1x1", "#4079e8");
    const [bounds] = projectSelectionBounds(
      { ...emptyScene(), nodes: [part] },
      camera,
      800,
      600,
    );
    // A diameter of 1 projects to 40 px; a rotated square would span 57 px.
    expect(bounds.width).toBeCloseTo(40, 0);
  });

  it("projette les transformations de groupes imbriqués et de pièces inclinées", () => {
    const part = makePart("slope-2x2", "#4079e8");
    part.rotation = [0.2, 0.6, 0.1];
    let scene = group({ ...emptyScene(), nodes: [part] }, [part.id], "inner");
    scene = group(scene, ["inner"], "outer");
    scene.nodes.find((node) => node.id === "outer")!.position = [4, 1, -3];
    scene.nodes.find((node) => node.id === "inner")!.rotation = [0, 0.7, 0];
    const camera = frontCamera();
    const bounds = projectSelectionBounds(scene, camera, 800, 600);
    const center = new Vector3(0, 0.6, 0)
      .applyMatrix4(worldMatrix(scene, part.id))
      .project(camera);
    expect(bounds[0].left).toBeLessThan((center.x + 1) * 400);
    expect(bounds[0].left + bounds[0].width).toBeGreaterThan(
      (center.x + 1) * 400,
    );
    expect(partsInsideBox(bounds, full)).toEqual([part.id]);
  });

  it("ignore les pièces derrière la caméra ou coupées par un plan de clipping", () => {
    const camera = frontCamera();
    camera.near = 1;
    camera.updateProjectionMatrix();
    const behind = makePart("brick-2x2", "#4079e8", [0, 0, 25]);
    const clipped = makePart("brick-2x2", "#4079e8", [0, 0, 19]);
    const visible = makePart("brick-2x2", "#4079e8");
    const scene = { ...emptyScene(), nodes: [behind, clipped, visible] };
    expect(
      partsInsideBox(projectSelectionBounds(scene, camera, 800, 600), full),
    ).toEqual([visible.id]);
  });

  it("remplace ou complète la sélection en une fois, sans historique et en actualisant la couleur", () => {
    const a = makePart("brick-1x1", "#4079e8");
    const b = makePart("brick-1x1", "#ef4444", [3, 0, 0]);
    const hidden = { ...makePart("brick-1x1", "#4079e8"), hidden: true };
    const scene = group(
      { ...emptyScene(), nodes: [a, b, hidden] },
      [a.id],
      "group",
    );
    const editor = useEditor.getState();
    editor.load(scene, "Cadre");
    editor.selectMany([a.id, hidden.id, "missing", a.id]);
    expect(useEditor.getState().selection).toEqual(["group"]);
    editor.selectMany([b.id], true);
    expect(new Set(useEditor.getState().selection)).toEqual(
      new Set(["group", b.id]),
    );
    expect(useEditor.getState().color).toBe(b.color);
    editor.select("group");
    editor.selectMany([a.id, b.id], true);
    expect(new Set(useEditor.getState().selection)).toEqual(
      new Set(["group", b.id]),
    );
    expect(useEditor.getState().scene).toEqual(scene);
    expect(useEditor.getState().past).toHaveLength(0);
    expect(useEditor.getState().serial).toBe(0);
    useEditor.setState({ boxSelect: true, boxSelecting: true });
    editor.cancel();
    expect(useEditor.getState().boxSelect).toBe(false);
    expect(useEditor.getState().boxSelecting).toBe(false);
    expect(new Set(useEditor.getState().selection)).toEqual(
      new Set(["group", b.id]),
    );
  });
});
