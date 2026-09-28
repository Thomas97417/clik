import { CylinderGeometry, ExtrudeGeometry, Shape } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CATALOG, type PartType } from "@clik/scene";
const geometries = new Map<PartType, ReturnType<typeof mergeGeometries>>();
export function geometry(type: PartType) {
  if (geometries.has(type)) return geometries.get(type)!;
  const { w, d, h } = CATALOG[type];
  let body;
  if (type === "slope-2x2") {
    const shape = new Shape();
    shape.moveTo(-d / 2, 0);
    shape.lineTo(d / 2, 0);
    shape.lineTo(d / 2, h);
    shape.lineTo(d / 2 - 1, h);
    shape.lineTo(-d / 2, 0.25);
    shape.closePath();
    body = new ExtrudeGeometry(shape, {
      depth: w - 0.05,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    });
    body.rotateY(-Math.PI / 2);
    body.translate((w - 0.05) / 2, 0, 0);
  } else {
    body = new RoundedBoxGeometry(w - 0.045, h - 0.035, d - 0.045, 2, 0.045);
    body.translate(0, h / 2, 0);
  }
  const parts = [
    body.toNonIndexed ? (body.index ? body.toNonIndexed() : body) : body,
  ];
  for (let x = 0; x < w; x++)
    for (let z = 0; z < d; z++) {
      if (type === "slope-2x2" && z === 0) continue;
      const stud = new CylinderGeometry(0.29, 0.3, 0.19, 16);
      stud.translate(x - (w - 1) / 2, h + 0.065, z - (d - 1) / 2);
      parts.push(stud.toNonIndexed());
    }
  const merged = mergeGeometries(parts);
  geometries.set(type, merged);
  return merged;
}
