import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SceneDocument } from "@clik/scene";
const Scene = lazy(() => import("./scene"));
class SceneBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="empty-state px-6.25 py-17.5 gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0]">
        <h2 className="text-[#32445f] text-2xl leading-[inherit] font-bold">
          La scène 3D n’a pas pu démarrer
        </h2>
        <p className="max-w-127.5 leading-[1.8]">
          Vérifiez WebGL et rechargez la page. Votre création enregistrée est
          conservée.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function ClientScene(props: {
  scene: SceneDocument;
  editable?: boolean;
  showGrid?: boolean;
  showViewControls?: boolean;
  poster?: string | null;
  title?: string;
}) {
  const placeholder = props.poster ? (
    <img
      className="public-scene-poster object-contain bg-[#edf1f7] size-full"
      src={props.poster}
      alt={`Aperçu de ${props.title || "la création"}`}
      width={640}
      height={480}
      fetchPriority="high"
    />
  ) : (
    <div className="empty-state px-6.25 py-17.5 gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0]">
      Ouverture de la scène…
    </div>
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <SceneBoundary>
      {mounted ? (
        <Suspense fallback={placeholder}>
          <Scene {...props} />
        </Suspense>
      ) : (
        placeholder
      )}
    </SceneBoundary>
  );
}
