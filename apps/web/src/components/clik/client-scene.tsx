import { cn } from "@/lib/utils";
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
      <div
        className={cn(
          "empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
        )}
      >
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
      className={cn(
        "public-scene-poster w-[100%] h-[100%] object-contain bg-[#edf1f7]",
      )}
      src={props.poster}
      alt={`Aperçu de ${props.title || "la création"}`}
      width={640}
      height={480}
      fetchPriority="high"
    />
  ) : (
    <div
      className={cn(
        "empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
      )}
    >
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
