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
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <SceneBoundary>
      {mounted ? (
        <Suspense
          fallback={<div className="empty-state">Ouverture de la scène…</div>}
        >
          <Scene {...props} />
        </Suspense>
      ) : (
        <div className="empty-state">Ouverture de la scène…</div>
      )}
    </SceneBoundary>
  );
}
