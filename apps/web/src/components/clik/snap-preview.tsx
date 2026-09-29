import { useLayoutEffect, useMemo, useRef } from "react";
import {
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Euler,
  Vector3,
} from "three";
import {
  descendants,
  inherited,
  worldMatrix,
  type Part,
  type PartType,
  type SelectionPreview,
} from "@clik/scene";
import { geometry } from "@/lib/clik/geometry";

const ghostMaterial = new MeshBasicMaterial({
  color: "#4599e8",
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
});
const studMaterial = new MeshBasicMaterial({
  color: "#73ffd2",
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
  depthTest: false,
});
const studGeometry = new CylinderGeometry(0.32, 0.32, 0.21, 20);
const noRaycast = () => {};
function GhostBatch({
  type,
  preview,
  parts,
}: {
  type: PartType;
  preview: SelectionPreview;
  parts: Part[];
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    parts.forEach((p, i) =>
      ref.current!.setMatrixAt(i, worldMatrix(preview.scene, p.id)),
    );
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [parts, preview]);
  return parts.length ? (
    <instancedMesh
      ref={ref}
      args={[geometry(type), ghostMaterial, parts.length]}
      raycast={noRaycast}
      renderOrder={2}
    />
  ) : null;
}
export function SnapPreview({ preview }: { preview: SelectionPreview }) {
  const studs = useRef<InstancedMesh>(null);
  const batches = useMemo(() => {
    const moving = new Set(descendants(preview.scene, preview.ids));
    const result = new Map<PartType, Part[]>();
    for (const n of preview.scene.nodes) {
      if (
        n.kind !== "part" ||
        !moving.has(n.id) ||
        inherited(preview.scene, n.id, "hidden")
      )
        continue;
      const parts = result.get(n.type) ?? [];
      parts.push(n);
      result.set(n.type, parts);
    }
    return result;
  }, [preview]);
  useLayoutEffect(() => {
    if (!studs.current) return;
    preview.points.forEach((p, i) => {
      const q = new Quaternion().setFromEuler(new Euler(...p.rotation));
      const offset = new Vector3(0, 0.07, 0).applyQuaternion(q);
      studs.current!.setMatrixAt(
        i,
        new Matrix4().compose(
          new Vector3(...p.position).add(offset),
          q,
          new Vector3(1, 1, 1),
        ),
      );
    });
    studs.current.instanceMatrix.needsUpdate = true;
    studs.current.computeBoundingSphere();
  }, [preview]);
  return (
    <>
      {[...batches].map(([type, parts]) => (
        <GhostBatch key={type} type={type} parts={parts} preview={preview} />
      ))}
      {preview.points.length > 0 && (
        <instancedMesh
          ref={studs}
          args={[studGeometry, studMaterial, preview.points.length]}
          raycast={noRaycast}
          renderOrder={3}
        />
      )}
    </>
  );
}
