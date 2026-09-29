import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
  CustomBlending,
  SrcAlphaFactor,
  OneMinusSrcAlphaFactor,
  OneFactor,
  DoubleSide,
  type Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { geometry } from "@/lib/clik/geometry";
import {
  CATALOG,
  inherited,
  matrix,
  movableRoots,
  type SelectionPreview,
  worldMatrix,
  type Part,
  type PartType,
  type SceneDocument,
} from "@clik/scene";
import { useEditor } from "@/lib/clik/store";
import { toast } from "sonner";
import { CAMERA_GIZMO_MARGIN, Gestures } from "./gestures";
import { SnapPreview } from "./snap-preview";
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
  const previous = useRef<{
    mesh: InstancedMesh;
    parts: Part[];
    selection: string[];
    editable: boolean;
  } | null>(null);
  const selection = useEditor((s) => s.selection);
  const parts = useMemo(
    () =>
      scene.nodes.filter(
        (n): n is Part =>
          n.kind === "part" &&
          n.type === type &&
          !n.hidden &&
          (!n.parentId || !inherited(scene, n.parentId, "hidden")),
      ),
    [scene, type],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const before = previous.current;
    let moved = false,
      recolored = false;
    parts.forEach((part, i) => {
      const unchanged = before?.mesh === mesh && before.parts[i] === part;
      // applyDelta shares untouched nodes. Root instances only need uploading
      // when they change; children also depend on their parent's transform.
      if (!unchanged || part.parentId) {
        mesh.setMatrixAt(
          i,
          part.parentId ? worldMatrix(scene, part.id) : matrix(part),
        );
        moved = true;
      }
      if (
        !unchanged ||
        before?.selection !== selection ||
        before.editable !== editable
      ) {
        const selected = selection.some(
          (id) =>
            id === part.id ||
            (part.parentId &&
              (part.parentId === id || isChild(scene, part.parentId, id))),
        );
        mesh.setColorAt(
          i,
          new Color(part.color).lerp(
            new Color("#ffffff"),
            editable && selected ? 0.18 : 0,
          ),
        );
        recolored = true;
      }
    });
    if (moved) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    if (recolored && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    previous.current = { mesh, parts, selection, editable };
  }, [parts, scene, selection, editable]);
  if (!parts.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry(type), material, parts.length]}
      castShadow
      receiveShadow
      userData={{ parts }}
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
function Manipulator({
  rotation,
}: {
  rotation: React.RefObject<ComponentRef<typeof TransformControls> | null>;
}) {
  const s = useEditor(),
    pivot = useRef<Group>(null),
    start = useRef(new Matrix4());
  const ids = movableRoots(s.scene, s.selection);
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
  if (!ids.length || s.tool !== "rotate") return null;
  return (
    <>
      <group ref={pivot} position={center.toArray()} />
      <TransformControls
        ref={rotation}
        object={pivot as React.RefObject<Group>}
        mode="rotate"
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
    controls = useRef<ComponentRef<typeof OrbitControls>>(null),
    s = useEditor(),
    rotation = useRef<ComponentRef<typeof TransformControls>>(null);
  const [gridStep, setGridStep] = useState(1);
  const [library, setLibrary] = useState<{
    preview: SelectionPreview | null;
    free: Part | null;
  }>({ preview: null, free: null });
  const onLibraryPreview = useCallback(
    (preview: SelectionPreview | null, free: Part | null) =>
      setLibrary({ preview, free }),
    [],
  );
  const preview = s.snap ? (s.pending ? library.preview : s.snapPreview) : null;
  useEffect(() => {
    gl.domElement.dataset.snapKind = preview?.kind ?? "none";
    gl.domElement.dataset.snapPoints = String(preview?.points.length ?? 0);
    gl.domElement.dataset.tool = s.tool;
  }, [gl, preview, s.tool]);
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
  useFrame(() => {
    if (!controls.current) return;
    // OrbitControls permits zooming well beyond the initial far plane. Keep
    // both clipping planes proportional to the viewing distance, also on zoom-in.
    const distance = camera.position.distanceTo(controls.current.target);
    // Keep resolvable lines at very wide zooms. Hysteresis prevents rapid
    // switching at a scale boundary; every coarser grid remains world-aligned.
    let step = gridStep;
    while (distance > step * 200) step *= 5;
    while (step > 1 && distance < step * 30) step /= 5;
    if (step !== gridStep) setGridStep(step);
    const near = Math.max(0.01, distance / 1000);
    const far = Math.max(1000, distance * 4);
    if (camera.near !== near || camera.far !== far) {
      camera.near = near;
      camera.far = far;
      camera.updateProjectionMatrix();
    }
  });
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
    camera.near = 0.1;
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
      {/* Transparent floor layers must never occlude each other through depth:
          their nearly coplanar surfaces otherwise flicker as the camera moves. */}
      <Grid
        renderOrder={-2}
        position={[0, -0.025, 0]}
        args={[2, 2]}
        onUpdate={(grid) => {
          // Drei attaches its shader material after the mesh is created.
          // Apply this to the attached material, not the temporary mesh default.
          const materials = Array.isArray(grid.material)
            ? grid.material
            : [grid.material];
          materials.forEach((material) => {
            // Render in the opaque queue BEFORE pieces, but retain alpha
            // blending for antialiased lines. A giant ground plane must not
            // compete with tiny piece surfaces through interpolated depth.
            material.transparent = false;
            material.blending = CustomBlending;
            material.blendSrc = SrcAlphaFactor;
            material.blendDst = OneMinusSrcAlphaFactor;
            material.blendSrcAlpha = OneFactor;
            material.blendDstAlpha = OneMinusSrcAlphaFactor;
            material.depthTest = false;
            material.depthWrite = false;
          });
        }}
        cellSize={gridStep}
        cellThickness={1}
        cellColor="#bcc8d8"
        sectionSize={gridStep * 5}
        sectionThickness={1.4}
        sectionColor="#b4c1d4"
        fadeDistance={100000}
        fadeStrength={0}
        followCamera
        side={DoubleSide}
        infiniteGrid
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.035, 0]}
        renderOrder={-1}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <shadowMaterial opacity={0.13} depthWrite={false} />
      </mesh>
      {(Object.keys(CATALOG) as PartType[]).map((type) => (
        <Batch key={type} type={type} scene={scene} editable={editable} />
      ))}
      {editable && s.pending && library.free && (
        <group matrixAutoUpdate={false} matrix={matrix(library.free)}>
          <mesh geometry={geometry(library.free.type)}>
            <meshStandardMaterial
              color={library.free.color}
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>
      )}
      {editable && preview && <SnapPreview preview={preview} />}
      {editable && s.tool === "rotate" && <Manipulator rotation={rotation} />}
      {editable && (
        <Gestures
          controls={controls}
          rotation={rotation}
          onLibraryPreview={onLibraryPreview}
        />
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={!s.gesture && !s.pending}
        minDistance={3}
        maxDistance={50000}
        maxPolarAngle={Math.PI * 0.95}
      />
      <GizmoHelper alignment="bottom-right" margin={CAMERA_GIZMO_MARGIN}>
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
  const liveScene = useEditor((s) => (editable ? s.scene : scene));
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
    >
      <Stage scene={liveScene} editable={editable} onCapture={onCapture} />
    </Canvas>
  );
}
