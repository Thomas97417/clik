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
      <div className="empty-state">
        <h2>La scène 3D n’a pas pu démarrer</h2>
        <p>
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
      className="public-scene-poster"
      src={props.poster}
      alt={`Aperçu de ${props.title || "la création"}`}
      width={640}
      height={480}
      fetchPriority="high"
    />
  ) : (
    <div className="empty-state">Ouverture de la scène…</div>
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
