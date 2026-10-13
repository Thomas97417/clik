import { useEffect, useId, useRef, useState } from "react";
import { Box, CircleHelp, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const welcomeKey = "clik-editor-welcome-v1";
let welcomeSeen = false;

function hasSeenWelcome() {
  if (welcomeSeen) return true;
  try {
    return localStorage.getItem(welcomeKey) === "seen";
  } catch {
    return false;
  }
}

function rememberWelcome() {
  welcomeSeen = true;
  try {
    localStorage.setItem(welcomeKey, "seen");
  } catch {
    // The current page still remembers the welcome when storage is unavailable.
  }
}

export default function EditorHelp({
  disabled,
  prepareTour,
}: {
  disabled: boolean;
  prepareTour: () => () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const tour = useRef<(() => void) | null>(null);
  const restore = useRef<(() => void) | null>(null);
  const mounted = useRef(false);
  const request = useRef(0);
  const prepare = useRef(prepareTour);
  prepare.current = prepareTour;
  const [welcome, setWelcome] = useState(false);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const welcomeId = useId();

  const finish = () => {
    tour.current = null;
    const reset = restore.current;
    restore.current = null;
    reset?.();
    if (mounted.current) {
      setRunning(false);
      setLoading(false);
      requestAnimationFrame(() => {
        if (mounted.current && trigger.current?.getClientRects().length)
          trigger.current.focus();
      });
    }
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current++;
      tour.current?.();
      const reset = restore.current;
      restore.current = null;
      reset?.();
    };
  }, []);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    if (disabled) {
      request.current++;
      tour.current?.();
      if (restore.current) finish();
      setWelcome(false);
      setLoading(false);
    }
    const update = () => {
      if (!element.getClientRects().length) {
        request.current++;
        tour.current?.();
        setWelcome(false);
        setLoading(false);
        return;
      }
      if (!disabled && !hasSeenWelcome()) {
        rememberWelcome();
        setWelcome(true);
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [disabled]);

  useEffect(() => {
    if (!welcome) return;
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setWelcome(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWelcome(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape);
    };
  }, [welcome]);

  const start = async () => {
    if (disabled || loading || running) return;
    rememberWelcome();
    setWelcome(false);
    setLoading(true);
    const currentRequest = ++request.current;
    try {
      // Neither the tour library nor its styles are loaded for the welcome alone.
      const { startEditorTour } = await import("./editor-tour");
      if (!mounted.current || request.current !== currentRequest) return;
      restore.current = prepare.current();
      setRunning(true);
      // Wait for the opened panels and their resized layout to reach the DOM.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (!mounted.current || request.current !== currentRequest) {
        finish();
        return;
      }
      tour.current = startEditorTour(finish);
      setLoading(false);
    } catch {
      finish();
      if (mounted.current)
        toast.error("La visite n’a pas pu démarrer. Réessayez depuis Aide.");
    }
  };

  return (
    <div ref={container} className="editor-help relative flex shrink-0">
      <Button
        ref={trigger}
        variant="outline"
        className="editor-help-trigger h-8 gap-1.5 rounded-[6px] border-transparent bg-transparent px-2.25 text-[11px] text-[#536888] [box-shadow:none] hover:enabled:border-[#dce6f8] hover:enabled:bg-[#edf3ff] hover:enabled:text-[#356ae6] max-xl-narrow:w-8 max-xl-narrow:px-0"
        aria-label="Aide de l’atelier"
        aria-haspopup="dialog"
        aria-expanded={running}
        aria-busy={loading || undefined}
        title="Découvrir les panneaux et les raccourcis de l’atelier"
        disabled={disabled || loading || running}
        onClick={() => void start()}
      >
        {loading ? (
          <LoaderCircle
            size={16}
            className="size-4 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <CircleHelp size={16} className="size-4" aria-hidden="true" />
        )}
        <span className="max-xl-narrow:hidden">Aide</span>
      </Button>
      {welcome && (
        <aside
          className="editor-welcome absolute right-0 top-[calc(100%+12px)] z-30 w-80 max-w-[calc(100vw-32px)] rounded-[12px] border border-solid border-[#dfe7f3] bg-white p-4 text-left whitespace-normal [box-shadow:0_12px_36px_#263b581a]"
          aria-labelledby={welcomeId}
          aria-live="polite"
        >
          <span
            className="absolute -top-1.25 right-6 size-2.5 rotate-45 border-l border-t border-solid border-[#dfe7f3] bg-white max-xl-narrow:right-2.75"
            aria-hidden="true"
          />
          <button
            type="button"
            className="absolute right-2.5 top-2.5 grid size-6 cursor-pointer place-items-center rounded-[5px] text-[#8996a9] outline-offset-2 hover:bg-[#f0f4fa] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-[#356ae6]"
            aria-label="Fermer le message de bienvenue"
            onClick={() => setWelcome(false)}
          >
            <X size={14} aria-hidden="true" />
          </button>
          <span
            className="mb-3 grid size-9 place-items-center rounded-[9px] bg-[#edf3ff] text-[#356ae6]"
            aria-hidden="true"
          >
            <Box size={20} />
          </span>
          <h2
            id={welcomeId}
            className="text-sm font-bold leading-5 text-[#263b58]"
          >
            Bienvenue dans l’atelier
          </h2>
          <p className="mt-1.5 text-xs leading-5 text-[#68788e]">
            Prenez vos marques à votre rythme. Le bouton{" "}
            <strong className="font-semibold text-[#356ae6]">Aide</strong> vous
            présente les panneaux et les raccourcis quand vous en avez envie.
          </p>
          <Button
            className="mt-3 h-8 rounded-[6px] bg-[#356ae6] px-3 text-[11px] font-semibold text-white hover:bg-[#2458ce]"
            onClick={() => setWelcome(false)}
          >
            Compris
          </Button>
        </aside>
      )}
    </div>
  );
}
