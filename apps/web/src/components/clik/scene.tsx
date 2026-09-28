import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  TransformControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import {
  Box3,
  Color,
  type Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import { geometry } from "@/lib/clik/geometry";
import {
  CATALOG,
  inherited,
  makePart,
  matrix,
  snapPart,
  worldMatrix,
  type Part,
  type PartType,
  type SceneDocument,
  type Vec3,
} from "@clik/scene";
import { useEditor } from "@/lib/clik/store";
import { toast } from "sonner";
const material = new MeshStandardMaterial({ roughness: 0.32, metalness: 0.02 });
function Batch({
  type,
  scene,
  editable,
}: {
  type: PartType;
  scene: SceneDocument;
  editable: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  const selection = useEditor((s) => s.selection);
  const parts = useMemo(
    () =>
      scene.nodes.filter(
        (n): n is Part =>
          n.kind === "part" &&
          n.type === type &&
          !inherited(scene, n.id, "hidden"),
      ),
    [scene, type],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    parts.forEach((part, i) => {
      mesh.setMatrixAt(i, worldMatrix(scene, part.id));
      const selected = selection.some(
        (id) => id === part.id || isChild(scene, part.id, id),
      );
      mesh.setColorAt(
        i,
        new Color(part.color).lerp(
          new Color("#a8c8ff"),
          editable && selected ? 0.4 : 0,
        ),
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [parts, scene, selection, editable]);
  if (!parts.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry(type), material, parts.length]}
      castShadow
      receiveShadow
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (!editable || useEditor.getState().pending) return;
        e.stopPropagation();
        const n = parts[e.instanceId ?? 0];
        useEditor.getState().select(n.id, e.shiftKey);
      }}
    />
  );
}
function isChild(scene: SceneDocument, id: string, parent: string): boolean {
  const n = scene.nodes.find((n) => n.id === id);
  return (
    !!n?.parentId &&
    (n.parentId === parent || isChild(scene, n.parentId, parent))
  );
}
function Manipulator() {
  const s = useEditor(),
    pivot = useRef<Group>(null),
    start = useRef(new Matrix4());
  const ids = s.selection.filter(
    (id) =>
      !inherited(s.scene, id, "locked") && !inherited(s.scene, id, "hidden"),
  );
  const center = useMemo(() => {
    const sum = new Vector3();
    ids.forEach((id) =>
      sum.add(new Vector3().setFromMatrixPosition(worldMatrix(s.scene, id))),
    );
    return sum.divideScalar(ids.length || 1);
  }, [s.selection, s.gesture ? null : s.scene]);
  useLayoutEffect(() => {
    if (pivot.current && !s.gesture) {
      pivot.current.position.copy(center);
      pivot.current.rotation.set(0, 0, 0);
      pivot.current.updateMatrixWorld();
    }
  }, [center, s.gesture]);
  if (!ids.length) return null;
  return (
    <>
      <group ref={pivot} position={center.toArray()} />
      <TransformControls
        object={pivot as React.RefObject<Group>}
        mode={s.tool}
        space="world"
        size={0.8}
        onMouseDown={() => {
          pivot.current!.updateMatrixWorld();
          start.current.copy(pivot.current!.matrixWorld);
          s.begin();
        }}
        onObjectChange={() => {
          if (useEditor.getState().gesture) {
            pivot.current!.updateMatrixWorld();
            s.preview(
              pivot
                .current!.matrixWorld.clone()
                .multiply(start.current.clone().invert()),
            );
          }
        }}
        onMouseUp={() => {
          try {
            s.end();
          } catch (e) {
            s.cancel();
            toast.error(String(e));
          }
        }}
      />
    </>
  );
}
function Stage({
  scene,
  editable,
  onCapture,
}: {
  scene: SceneDocument;
  editable: boolean;
  onCapture?: (capture: () => Promise<ArrayBuffer>) => void;
}) {
  const { camera, gl, scene: threeScene } = useThree(),
    controls = useRef<any>(null),
    s = useEditor(),
    ghost = useRef<Group>(null);
  const [preview, setPreview] = useState<Part | null>(null);
  useEffect(() => {
    const previous = threeScene.onAfterRender;
    threeScene.onAfterRender = () => {
      gl.domElement.dataset.rendered = String(scene.nodes.length);
      gl.domElement.dataset.frames = String(
        Number(gl.domElement.dataset.frames ?? 0) + 1,
      );
    };
    return () => {
      threeScene.onAfterRender = previous;
    };
  }, [threeScene, gl, scene.nodes.length]);
  const frame = s.frame,
    view = s.view;
  useEffect(() => {
    const boxes = scene.nodes
      .filter(
        (n) =>
          n.kind === "part" &&
          !inherited(scene, n.id, "hidden") &&
          (!editable ||
            !s.selection.length ||
            s.selection.includes(n.id) ||
            s.selection.some((id) => isChild(scene, n.id, id))),
      )
      .map((n) => {
        const { w, h, d } = CATALOG[(n as Part).type];
        return new Box3(
          new Vector3(-w / 2, 0, -d / 2),
          new Vector3(w / 2, h + 0.2, d / 2),
        ).applyMatrix4(worldMatrix(scene, n.id));
      });
    const box = boxes.reduce((total, next) => total.union(next), new Box3());
    if (box.isEmpty())
      box.setFromCenterAndSize(new Vector3(), new Vector3(2, 2, 2));
    const center = box.getCenter(new Vector3()),
      aspect = "aspect" in camera ? (camera.aspect as number) : 1,
      size = Math.max(
        9,
        box.getSize(new Vector3()).length() * 1.6 * Math.max(1, 1 / aspect),
      );
    const direction =
      view === "top"
        ? new Vector3(0.001, 1, 0)
        : view === "front"
          ? new Vector3(0, 0.12, 1)
          : view === "right"
            ? new Vector3(1, 0.12, 0)
            : new Vector3(1, 0.9, 1);
    camera.position.copy(
      center.clone().add(direction.normalize().multiplyScalar(size)),
    );
    camera.near = Math.max(0.1, size / 1000);
    camera.far = Math.max(1000, size * 4);
    camera.updateProjectionMatrix();
    camera.lookAt(center);
    controls.current?.target.copy(center);
    controls.current?.update();
  }, [frame, view]);
  useEffect(() => {
    onCapture?.(async () => {
      gl.render(threeScene, camera);
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 600;
      canvas.getContext("2d")!.drawImage(gl.domElement, 0, 0, 800, 600);
      return new Promise<ArrayBuffer>((resolve, reject) =>
        canvas.toBlob(
          async (blob) =>
            blob
              ? resolve(await blob.arrayBuffer())
              : reject(Error("Capture impossible.")),
          "image/png",
        ),
      );
    });
  }, [onCapture, gl, threeScene, camera]);
  useEffect(() => {
    if (!editable) return;
    const canvas = gl.domElement;
    const locate = (event: DragEvent) => {
      const rect = canvas.getBoundingClientRect(),
        ray = new Raycaster();
      ray.setFromCamera(
        new Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hits = ray
        .intersectObjects(threeScene.children, true)
        .filter((h) => h.object instanceof InstancedMesh);
      const pos =
        hits[0]?.point.clone() ??
        ray.ray.intersectPlane(
          new Plane(new Vector3(0, 1, 0), 0),
          new Vector3(),
        );
      if (!pos) return;
      const state = useEditor.getState();
      if (!state.pending) return;
      const part = snapPart(
        state.scene,
        makePart(state.pending, state.color, pos.toArray() as Vec3),
        state.snap,
      );
      setPreview(part);
      return part;
    };
    const over = (e: DragEvent) => {
      if (!useEditor.getState().pending) return;
      e.preventDefault();
      locate(e);
    };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      const part = locate(e);
      if (part)
        try {
          const state = useEditor.getState();
          state.commit({ ...state.scene, nodes: [...state.scene.nodes, part] });
          useEditor.setState({ selection: [part.id], pending: null });
        } catch (error) {
          toast.error(String(error));
        }
      setPreview(null);
    };
    canvas.addEventListener("dragover", over);
    canvas.addEventListener("drop", drop);
    return () => {
      canvas.removeEventListener("dragover", over);
      canvas.removeEventListener("drop", drop);
    };
  }, [gl, camera, threeScene, editable]);
  return (
    <>
      <color attach="background" args={["#edf1f7"]} />
      <ambientLight intensity={1.6} />
      <directionalLight
        position={[10, 16, 8]}
        intensity={2.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0005}
      />
      <Grid
        position={[0, -0.025, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.65}
        cellColor="#cbd4e1"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#b4c1d4"
        fadeDistance={65}
        infiniteGrid
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.035, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <shadowMaterial opacity={0.13} />
      </mesh>
      {(Object.keys(CATALOG) as PartType[]).map((type) => (
        <Batch key={type} type={type} scene={scene} editable={editable} />
      ))}
      {editable && s.pending && preview && (
        <group ref={ghost} matrixAutoUpdate={false} matrix={matrix(preview)}>
          <mesh geometry={geometry(preview.type)}>
            <meshStandardMaterial
              color={preview.color}
              transparent
              opacity={0.5}
            />
          </mesh>
        </group>
      )}
      {editable && <Manipulator />}
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={!s.gesture && !s.pending}
        minDistance={3}
        maxDistance={50000}
        maxPolarAngle={Math.PI * 0.95}
      />
      <GizmoHelper alignment="bottom-right" margin={[65, 65]}>
        <GizmoViewport
          axisColors={["#ed6a65", "#60b58a", "#5c8fe3"]}
          labelColor="white"
        />
      </GizmoHelper>
    </>
  );
}
export default function Scene({
  scene,
  editable = false,
  onCapture,
}: {
  scene: SceneDocument;
  editable?: boolean;
  onCapture?: (capture: () => Promise<ArrayBuffer>) => void;
}) {
  const [supported] = useState(() => {
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  });
  if (!supported)
    return (
      <div className="empty-state">
        <h2>La 3D n’est pas disponible</h2>
        <p>
          Activez WebGL et l’accélération graphique dans votre navigateur pour
          ouvrir cette scène.
        </p>
      </div>
    );
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [11, 10, 11], fov: 40, near: 0.1, far: 1000 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onPointerMissed={() => {
        if (editable && !useEditor.getState().gesture)
          useEditor.setState({ selection: [] });
      }}
    >
      <Stage scene={scene} editable={editable} onCapture={onCapture} />
    </Canvas>
  );
}
