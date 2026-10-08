import { seo, absolute } from "@/lib/seo/meta";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Castle,
  Check,
  ChevronRight,
  FolderOpen,
  GitBranch,
  House,
  TowerControl,
  Monitor,
  Palette,
  Plus,
} from "lucide-react";
import { CATALOG, COLORS } from "@clik/scene";
import CreationPreview from "@/components/clik/creation-preview";
import HomeStepArt from "@/components/clik/home-step-art";
import HomeNextArt from "@/components/clik/home-next-art";
import { writeDraft } from "@/lib/clik/local";
import {
  STARTER_COLORS,
  STARTER_MODELS,
  starterScene,
  type StarterColor,
} from "@/lib/clik/starter-models";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: "Construction en briques 3D en ligne",
      text: "Créez en briques 3D directement dans votre navigateur avec Clik. Assemblez vos idées, relevez les défis du jour et partagez vos constructions.",
      path: "/",
      schema: [
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": absolute("/#website"),
          name: "Clik",
          url: absolute("/"),
          inLanguage: "fr",
        },
        {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Clik",
          url: absolute("/"),
          applicationCategory: "DesignApplication",
          operatingSystem: "Web",
          browserRequirements: "Navigateur compatible WebGL 2",
          description: "Atelier de construction en briques 3D en ligne.",
        },
      ],
    }),
  component: Home,
});
const modelIcons = [House, TowerControl, Castle];

function Home() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(0);
  const [color, setColor] = useState<StarterColor>(STARTER_MODELS[0].color);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const opening = useRef(false);
  const steps = useRef<HTMLElement>(null);
  const model = STARTER_MODELS[selected];
  const scene = useMemo(() => starterScene(model.id, color), [model.id, color]);
  const create = async (fromModel: boolean) => {
    if (opening.current) return;
    opening.current = true;
    setBusy(true);
    setError(false);
    try {
      const id = crypto.randomUUID();
      if (fromModel) {
        await writeDraft(`guest:${id}`, {
          scene,
          title: `${model.name} · ma version`,
          stamp: crypto.randomUUID(),
          revision: 0,
          dirty: false,
        });
      }
      await navigate({ to: "/editor", search: { draft: id } });
    } catch {
      setError(true);
    } finally {
      opening.current = false;
      setBusy(false);
    }
  };
  return (
    <main className="home px-[5%] py-0 m-auto max-w-360 max-lg-narrow:px-[6%]">
      <section
        className="home-hero px-0 gap-[clamp(28px,4vw,64px)] grid grid-cols-[0.92fr_1.08fr] items-center pt-16 pb-12 max-lg-narrow:gap-9 max-lg-narrow:grid-cols-1 max-lg-narrow:pt-10.5 max-lg-narrow:pb-8 min-lg-narrow:max-xl-narrow:gap-7 min-lg-narrow:max-xl-narrow:pt-12 motion-reduce:transition-none"
        aria-labelledby="home-title"
      >
        <div className="home-copy max-lg-narrow:max-w-145 motion-reduce:transition-none">
          <h1
            className="motion-reduce:transition-none mx-0 my-6 text-[clamp(52px,_5.5vw,_82px)] leading-[1.02] tracking-[-4px] font-[850] max-sm-narrow:my-5.5 max-sm-narrow:text-[clamp(40px,_11vw,_56px)] max-sm-narrow:tracking-[-2.5px] min-sm-narrow:max-lg-narrow:text-[64px] min-sm-narrow:max-lg-narrow:tracking-[-3px] min-lg-narrow:max-xl-narrow:text-[62px]"
            id="home-title"
          >
            Un petit clik
            <em className="motion-reduce:transition-none not-italic text-[#356ae6]">
              .
            </em>
            <br className="motion-reduce:transition-none max-lg-narrow:[&:last-of-type]:hidden" />
            Une{" "}
            <em className="motion-reduce:transition-none not-italic text-[#356ae6]">
              grande
            </em>
            <br className="motion-reduce:transition-none max-lg-narrow:[&:last-of-type]:hidden" />{" "}
            <em className="motion-reduce:transition-none not-italic text-[#356ae6]">
              idée.
            </em>
          </h1>
          <p className="motion-reduce:transition-none max-w-97.5 text-base text-[#697a93] leading-[1.85] max-lg-narrow:max-w-120 max-lg-narrow:text-[15px]">
            Un atelier de construction en briques 3D, dans votre navigateur.
            Donnez forme à ce que vous avez en tête, brique après brique.
          </p>
          <div className="home-buttons home-desktop-actions max-lg-narrow:hidden mx-0 flex flex-wrap items-center gap-y-4.5 gap-x-6 mt-7 mb-4.5 motion-reduce:transition-none">
            <button
              className="cursor-pointer [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 primary-link group/primary-link px-4.75 py-3 gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white rounded-[9px] text-sm leading-[inherit] font-[650] whitespace-nowrap hover:bg-[#2458ce] min-h-12 disabled:opacity-60 disabled:cursor-wait motion-reduce:transition-none motion-reduce:duration-0"
              disabled={busy}
              onClick={() => void create(false)}
            >
              <Plus
                className="shrink-0 motion-reduce:transition-none"
                size={18}
                aria-hidden="true"
              />{" "}
              Créer une construction
            </button>
            <Link
              to="/gallery"
              className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 home-text-link gap-1.75 inline-flex items-center text-[13px] font-[650] text-[#405575] hover:text-[#2458ce] motion-reduce:transition-none motion-reduce:duration-0"
            >
              Explorer la galerie{" "}
              <ArrowUpRight
                className="motion-reduce:transition-none"
                size={17}
                aria-hidden="true"
              />
            </Link>
          </div>
          <div className="home-mobile-actions hidden max-lg-narrow:mx-0 max-lg-narrow:block max-lg-narrow:mt-6 max-lg-narrow:mb-3.75 motion-reduce:transition-none">
            <Link
              to="/gallery"
              className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 primary-link group/primary-link px-4.75 py-3 gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white rounded-[9px] text-sm font-[650] whitespace-nowrap hover:bg-[#2458ce] min-h-12 motion-reduce:transition-none leading-normal motion-reduce:duration-0"
            >
              Explorer la galerie{" "}
              <ArrowRight
                className="motion-reduce:transition-none"
                size={18}
                aria-hidden="true"
              />
            </Link>
          </div>
          <p className="home-device-note group/home-device-note motion-reduce:transition-none max-w-97.5 text-[#697a93] max-lg-narrow:max-w-120 gap-1.75 hidden items-center text-[11px] leading-[1.7] max-lg-narrow:flex max-lg-narrow:mt-1.25">
            <Monitor
              className="motion-reduce:transition-none"
              size={15}
              aria-hidden="true"
            />{" "}
            Pour construire, ouvrez l’atelier sur ordinateur.
          </p>
          <Link
            to="/projects"
            className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 home-resume hover:text-[#2458ce] gap-2.25 inline-flex items-center text-[#657895] text-xs font-[550] mt-7 max-lg-narrow:mt-5 motion-reduce:transition-none leading-normal motion-reduce:duration-0"
          >
            <FolderOpen
              className="motion-reduce:transition-none last:ml-1.5"
              size={17}
              aria-hidden="true"
            />{" "}
            Retrouver mes créations{" "}
            <ChevronRight
              className="motion-reduce:transition-none last:ml-1.5"
              size={16}
              aria-hidden="true"
            />
          </Link>
        </div>
        <div className="home-playground overflow-hidden border border-solid border-[#dfe5f0] min-w-0 rounded-[22px] bg-white [box-shadow:0_24px_65px_-35px_#7185b454] max-sm-narrow:rounded-2xl motion-reduce:transition-none">
          <div className="home-model-viewer [background:radial-gradient(ellipse_at_50%_45%,#fff_0%,#f3f6fc_65%,#edf2fa)] motion-reduce:transition-none">
            <div
              className="home-model-options px-4 gap-1 flex items-center justify-center pt-3 pb-0 max-sm-narrow:px-2 max-sm-narrow:gap-0.5 max-sm-narrow:pt-2 motion-reduce:transition-none"
              role="group"
              aria-label="Choisir un modèle"
            >
              {STARTER_MODELS.map((item, index) => {
                const Icon = modelIcons[index];
                return (
                  <button
                    className="cursor-pointer outline-offset-3 disabled:opacity-60 disabled:cursor-wait  px-3.5 py-2 gap-1.75 relative inline-flex items-center justify-center min-h-10 rounded-[8px] text-[#667894] text-xs leading-[inherit] font-[550] [transition:background_150ms,color_150ms] max-sm-narrow:px-2.5 max-sm-narrow:gap-1.5 max-sm-narrow:min-h-11 max-sm-narrow:text-[11px] after:absolute after:bottom-0.5 after:left-3.5 after:right-3.5 after:h-0.5 after:rounded-xs after:bg-[#356ae6] after:[content:''] after:opacity-0 hover:bg-[#ffffffa6] hover:text-[#345fbb] aria-pressed:bg-[#ffffffb3] aria-pressed:text-[#285abd] [&[aria-pressed='true']::after]:opacity-100 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 "
                    key={item.id}
                    aria-label={item.label}
                    aria-controls="home-model-preview"
                    aria-pressed={selected === index}
                    onClick={() => {
                      if (selected === index) return;
                      setSelected(index);
                      setColor(item.color);
                    }}
                  >
                    <Icon
                      className="motion-reduce:transition-none"
                      size={15}
                      aria-hidden="true"
                    />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div
              className="home-model-stage overflow-hidden h-[clamp(280px,25vw,350px)] relative isolate max-sm-narrow:h-72.5 min-sm-narrow:max-lg-narrow:h-95 motion-reduce:transition-none"
              id="home-model-preview"
            >
              <div
                className="home-model-halo border border-solid border-[#dce5f580] absolute w-3/4 h-[65%] rounded-[50%] left-1/2 top-1/2 transform-[translate(-50%,-50%)_rotate(-18deg)] -z-1 motion-reduce:transition-none"
                aria-hidden="true"
              />
              <CreationPreview
                controlsButtonClassName="motion-reduce:transition-none motion-reduce:duration-0"
                controlsClassName="max-sm-narrow:right-2"
                canvasClassName="object-contain filter-[drop-shadow(0_16px_12px_#37436918)] size-full"
                imageClassName="object-contain filter-[drop-shadow(0_16px_12px_#37436918)] size-full"
                className="motion-reduce:transition-none top-0 right-2.5 bottom-4 left-2.5 max-sm-narrow:right-1 max-sm-narrow:bottom-3 max-sm-narrow:left-1"
                interactive
                initialZoom={model.id === "house" ? 1 : 1.2}
                scene={scene}
                cacheKey={`starter-v3:${model.id}:${color}`}
                poster={
                  color === model.color ? `/models/${model.id}.png` : undefined
                }
                title={model.name}
              />
            </div>
          </div>
          <div className="home-palette-row px-6 py-3.25 gap-3 flex items-center justify-between border-t border-solid border-t-[#e9eef7] border-b border-b-[#e9eef7] bg-[#fafbfe] max-sm-narrow:px-4 max-sm-narrow:py-3.5 max-sm-narrow:flex-wrap motion-reduce:transition-none">
            <span className="motion-reduce:transition-none text-[#6c7d98] text-[11px]">
              Couleur d’accent
            </span>
            <div
              className="home-palette gap-3 flex items-center max-sm-narrow:gap-2.75 motion-reduce:transition-none"
              role="group"
              aria-label="Couleur du modèle"
            >
              {STARTER_COLORS.map((swatch) => (
                <button
                  className="cursor-pointer outline-offset-3 disabled:opacity-60 disabled:cursor-wait motion-reduce:transition-none grid place-items-center bg-[var(--swatch)] text-white rounded-full [transition:transform_150ms] hover:transform-[scale(1.1)] aria-[pressed=true]:outline-2 aria-[pressed=true]:outline-solid aria-[pressed=true]:outline-(--swatch) aria-pressed:outline-offset-3 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#202b41] focus-visible:outline-offset-4 size-6.5 max-sm-narrow:size-7 motion-reduce:duration-0"
                  key={swatch.value}
                  style={{ "--swatch": swatch.value } as CSSProperties}
                  aria-label={swatch.name}
                  aria-pressed={color === swatch.value}
                  title={swatch.name}
                  onClick={() => setColor(swatch.value)}
                >
                  {color === swatch.value && (
                    <Check
                      className="shrink-0 motion-reduce:transition-none"
                      size={17}
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div
            className="home-model-details px-6 gap-4 flex items-start justify-between pt-5 pb-4.5 min-h-27.5 max-sm-narrow:px-4.5 max-sm-narrow:gap-3 max-sm-narrow:min-h-21 max-sm-narrow:flex-wrap min-sm-narrow:max-lg-narrow:px-4.5 min-sm-narrow:max-lg-narrow:gap-1 min-sm-narrow:max-lg-narrow:min-h-21 min-sm-narrow:max-lg-narrow:flex-wrap min-lg-narrow:max-xl-narrow:px-4.5 min-lg-narrow:max-xl-narrow:gap-1 min-lg-narrow:max-xl-narrow:flex-wrap motion-reduce:transition-none"
            aria-live="polite"
          >
            <div className="motion-reduce:transition-none">
              <h2 className="motion-reduce:transition-none text-base leading-[inherit] font-[750] mb-1.5">
                {model.name}
              </h2>
              <p className="motion-reduce:transition-none text-xs leading-[1.65] text-[#7a879d] max-w-82.5 max-xl-narrow:max-w-none">
                {model.description}
              </p>
            </div>
            <span className="home-model-count px-2 py-1.25 gap-1.25 inline-flex items-center shrink-0 mt-0.5 rounded-[6px] bg-[#f3f6fb] text-[#657893] text-[10px] motion-reduce:transition-none">
              <Blocks
                className="motion-reduce:transition-none"
                size={14}
                aria-hidden="true"
              />{" "}
              {scene.nodes.length} pièces
            </span>
          </div>
          <div className="home-fork home-desktop-actions max-lg-narrow:hidden relative pt-0 pr-6 pb-5.5 pl-17.5 motion-reduce:transition-none">
            <svg
              className="home-fork-path absolute left-5.5 top-0 w-9.5 h-23.75 stroke-[#becce3] stroke-2 [stroke-linecap:round] motion-reduce:transition-none"
              viewBox="0 0 44 100"
              fill="none"
              aria-hidden="true"
            >
              <path
                className="home-fork-original [stroke-dasharray:3_5] motion-reduce:transition-none"
                d="M8 9v80"
              />
              <path
                className="home-fork-branch stroke-[#356ae6] motion-reduce:transition-none"
                d="M8 9v18c0 24 28 12 28 36v12"
              />
              <circle
                className="motion-reduce:transition-none fill-white"
                cx="8"
                cy="9"
                r="4"
              />
              <circle
                className="home-fork-end stroke-[#356ae6] motion-reduce:transition-none fill-white"
                cx="36"
                cy="79"
                r="4"
              />
            </svg>
            <span className="home-fork-source px-0 block pt-0.5 pb-3 text-[#8391a7] text-[11px] motion-reduce:transition-none">
              Le modèle est le point de départ.
            </span>
            <button
              className="cursor-pointer outline-offset-3 home-model-start focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 px-3.75 py-3.25 gap-2.5 border border-solid border-[#d4e0fb] flex items-center justify-between w-full text-left text-[#356ae6] rounded-[12px] bg-[#f1f5ff] [transition:background_150ms,border-color_150ms] hover:border-[#a6bfee] hover:bg-[#e7efff] disabled:opacity-60 disabled:cursor-wait motion-reduce:transition-none motion-reduce:duration-0"
              aria-label={busy ? "Ouverture…" : "Créer ma version"}
              disabled={busy}
              onClick={() => void create(true)}
            >
              <span className="motion-reduce:transition-none">
                <strong className="motion-reduce:transition-none gap-1.75 flex items-center text-[13px] font-[650]">
                  <GitBranch
                    className="shrink-0 motion-reduce:transition-none"
                    size={16}
                    aria-hidden="true"
                  />{" "}
                  {busy ? "Ouverture…" : "Créer ma version"}
                </strong>
                <span className="motion-reduce:transition-none block mt-1.25 text-[#7082a2] text-[11px] leading-normal">
                  Une copie à transformer. Une nouvelle direction.
                </span>
              </span>
              <ArrowUpRight
                className="motion-reduce:transition-none shrink-0"
                size={19}
                aria-hidden="true"
              />
            </button>
          </div>
          {error && (
            <p
              className="home-start-error p-3 mx-5 mt-0 mb-5 rounded-[8px] bg-[#fff3ed] text-[#9a3c24] text-xs leading-[1.7] motion-reduce:transition-none"
              role="alert"
            >
              Impossible d’ouvrir la création. Vérifiez que le stockage de votre
              navigateur est disponible, puis réessayez.
            </p>
          )}
        </div>
      </section>

      <div className="home-discover-bar px-0 py-5.5 gap-8 flex items-center border-t border-solid border-t-[#e0e6ef] border-b border-b-[#e0e6ef] text-[#74819a] text-xs leading-[inherit] max-sm-narrow:gap-y-4.5 max-sm-narrow:gap-x-2 max-sm-narrow:text-[11px] max-sm-narrow:flex-wrap max-sm-narrow:justify-between min-sm-narrow:max-lg-narrow:gap-4.5 min-sm-narrow:max-lg-narrow:text-[11px] min-sm-narrow:max-lg-narrow:flex-wrap motion-reduce:transition-none">
        <span className="motion-reduce:transition-none gap-2.25 flex items-center">
          <Blocks
            className="motion-reduce:transition-none"
            size={17}
            aria-hidden="true"
          />{" "}
          {Object.keys(CATALOG).length} formes à assembler
        </span>
        <span className="motion-reduce:transition-none gap-2.25 flex items-center">
          <Palette
            className="motion-reduce:transition-none"
            size={17}
            aria-hidden="true"
          />{" "}
          {COLORS.length} couleurs à mélanger
        </span>
        <button
          className="cursor-pointer [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 disabled:opacity-60 disabled:cursor-wait motion-reduce:transition-none gap-2.25 flex items-center ml-auto font-semibold text-[#405575] min-h-6 max-sm-narrow:ml-0 max-sm-narrow:w-full max-sm-narrow:justify-center max-sm-narrow:pt-0.75 motion-reduce:duration-0"
          onClick={() => {
            steps.current?.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "instant"
                : "smooth",
              block: "start",
            });
            steps.current?.focus({ preventScroll: true });
          }}
        >
          Comment ça marche{" "}
          <ArrowDown
            className="shrink-0 motion-reduce:transition-none"
            size={16}
            aria-hidden="true"
          />
        </button>
      </div>

      <section
        ref={steps}
        tabIndex={-1}
        className="home-how px-0 py-18 scroll-mt-7 max-lg-narrow:py-12 focus:outline-none motion-reduce:transition-none"
        aria-labelledby="home-how-title"
      >
        <div className="home-section-heading mb-7 motion-reduce:transition-none">
          <h2
            className="motion-reduce:transition-none m-0 text-[clamp(30px,_3vw,_40px)] leading-[1.2] tracking-[-1.5px] font-extrabold max-sm-narrow:text-3xl max-sm-narrow:max-w-67.5"
            id="home-how-title"
          >
            Prenez le temps de{" "}
            <em className="motion-reduce:transition-none not-italic text-[#356ae6]">
              jouer.
            </em>
          </h2>
        </div>
        <div className="home-steps gap-4.5 grid grid-cols-3 max-sm-narrow:gap-3.5 max-sm-narrow:grid-cols-1 min-sm-narrow:max-lg-narrow:gap-3 motion-reduce:transition-none">
          <article className="motion-reduce:transition-none px-7 border border-solid border-[#e1e7f0] [--step-tint:#f3f7ff] [--step-ink:#5c7cb1] min-w-0 pt-6 pb-7 rounded-[20px] [background:linear-gradient(155deg,var(--step-tint),#fff_65%)] max-sm-narrow:p-6.25 min-sm-narrow:max-lg-narrow:p-5 min-lg-narrow:max-xl-narrow:p-5.5 [&:nth-child(2)]:[--step-tint:#f8f3fd] [&:nth-child(2)]:[--step-ink:#9273b1] [&:nth-child(3)]:[--step-tint:#fff8ef] [&:nth-child(3)]:[--step-ink:#ad8054]">
            <div className="home-step-top gap-2 flex items-start justify-between mb-3.5 max-sm-narrow:mb-2.5 motion-reduce:transition-none">
              <span
                className="home-step-number border border-solid border-white grid place-items-center shrink-0 mt-0.75 rounded-[9px] bg-[#ffffffb3] text-[var(--step-ink)] text-[11px] font-semibold tabular-nums size-7.5 motion-reduce:transition-none"
                aria-hidden="true"
              >
                01
              </span>
              <HomeStepArt
                className="motion-reduce:transition-none"
                step="build"
              />
            </div>
            <h3 className="motion-reduce:transition-none mx-0 text-lg font-[750] tracking-[-0.45px] mt-0 mb-2.75 leading-[1.35] max-sm-narrow:text-[17px] min-sm-narrow:max-lg-narrow:text-[15px]">
              Posez la première pièce.
            </h3>
            <p className="motion-reduce:transition-none m-0 text-[13px] leading-[1.85] text-[#65758e]">
              Glissez une forme dans l’atelier. Les pièces s’aimantent pour vous
              aider à les assembler.
            </p>
          </article>
          <article className="motion-reduce:transition-none px-7 border border-solid border-[#e1e7f0] [--step-tint:#f3f7ff] [--step-ink:#5c7cb1] min-w-0 pt-6 pb-7 rounded-[20px] [background:linear-gradient(155deg,var(--step-tint),#fff_65%)] max-sm-narrow:p-6.25 min-sm-narrow:max-lg-narrow:p-5 min-lg-narrow:max-xl-narrow:p-5.5 [&:nth-child(2)]:[--step-tint:#f8f3fd] [&:nth-child(2)]:[--step-ink:#9273b1] [&:nth-child(3)]:[--step-tint:#fff8ef] [&:nth-child(3)]:[--step-ink:#ad8054]">
            <div className="home-step-top gap-2 flex items-start justify-between mb-3.5 max-sm-narrow:mb-2.5 motion-reduce:transition-none">
              <span
                className="home-step-number border border-solid border-white grid place-items-center shrink-0 mt-0.75 rounded-[9px] bg-[#ffffffb3] text-[var(--step-ink)] text-[11px] font-semibold tabular-nums size-7.5 motion-reduce:transition-none"
                aria-hidden="true"
              >
                02
              </span>
              <HomeStepArt
                className="motion-reduce:transition-none"
                step="play"
              />
            </div>
            <h3 className="motion-reduce:transition-none mx-0 text-lg font-[750] tracking-[-0.45px] mt-0 mb-2.75 leading-[1.35] max-sm-narrow:text-[17px] min-sm-narrow:max-lg-narrow:text-[15px]">
              Faites-la à votre façon.
            </h3>
            <p className="motion-reduce:transition-none m-0 text-[13px] leading-[1.85] text-[#65758e]">
              Changez les couleurs, tournez, dupliquez. Essayez une autre
              direction : vous pouvez toujours annuler.
            </p>
          </article>
          <article className="motion-reduce:transition-none px-7 border border-solid border-[#e1e7f0] [--step-tint:#f3f7ff] [--step-ink:#5c7cb1] min-w-0 pt-6 pb-7 rounded-[20px] [background:linear-gradient(155deg,var(--step-tint),#fff_65%)] max-sm-narrow:p-6.25 min-sm-narrow:max-lg-narrow:p-5 min-lg-narrow:max-xl-narrow:p-5.5 [&:nth-child(2)]:[--step-tint:#f8f3fd] [&:nth-child(2)]:[--step-ink:#9273b1] [&:nth-child(3)]:[--step-tint:#fff8ef] [&:nth-child(3)]:[--step-ink:#ad8054]">
            <div className="home-step-top gap-2 flex items-start justify-between mb-3.5 max-sm-narrow:mb-2.5 motion-reduce:transition-none">
              <span
                className="home-step-number border border-solid border-white grid place-items-center shrink-0 mt-0.75 rounded-[9px] bg-[#ffffffb3] text-[var(--step-ink)] text-[11px] font-semibold tabular-nums size-7.5 motion-reduce:transition-none"
                aria-hidden="true"
              >
                03
              </span>
              <HomeStepArt
                className="motion-reduce:transition-none"
                step="share"
              />
            </div>
            <h3 className="motion-reduce:transition-none mx-0 text-lg font-[750] tracking-[-0.45px] mt-0 mb-2.75 leading-[1.35] max-sm-narrow:text-[17px] min-sm-narrow:max-lg-narrow:text-[15px]">
              Gardez-la. Ou partagez-la.
            </h3>
            <p className="motion-reduce:transition-none m-0 text-[13px] leading-[1.85] text-[#65758e]">
              Retrouvez votre création sur cet appareil. Avec un compte,
              conservez-la en ligne et publiez-la quand vous le souhaitez.
            </p>
          </article>
        </div>
      </section>

      <section
        className="home-next gap-5 grid grid-cols-[1.6fr_1fr] pb-16 max-lg-narrow:grid-cols-1 max-lg-narrow:pb-11 motion-reduce:transition-none"
        aria-label="Poursuivre l’aventure"
      >
        <Link
          to="/gallery"
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 home-gallery-link p-9 gap-5 overflow-hidden min-w-0 rounded-[22px] grid grid-cols-[minmax(0,1fr)_minmax(180px,0.8fr)] items-center [background:radial-gradient(ellipse_at_90%_15%,#36538b,transparent_65%),#243d77] text-white max-sm-narrow:p-7 max-sm-narrow:gap-6.5 max-sm-narrow:grid-cols-1 min-sm-narrow:max-lg-narrow:p-7 min-sm-narrow:max-lg-narrow:gap-4 min-sm-narrow:max-lg-narrow:grid-cols-[minmax(0,1fr)_minmax(160px,0.8fr)] min-lg-narrow:max-xl-narrow:p-7 min-lg-narrow:max-xl-narrow:gap-4 min-lg-narrow:max-xl-narrow:grid-cols-[minmax(0,1fr)_minmax(130px,0.75fr)] motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4 group/home-gallery-link motion-reduce:duration-0"
        >
          <div className="home-next-copy flex flex-col items-start motion-reduce:transition-none">
            <h2 className="motion-reduce:transition-none mx-0 text-[clamp(26px,_2.6vw,_34px)] leading-[1.18] font-extrabold tracking-[-1px] mt-0 mb-4 max-sm-narrow:text-[28px]">
              Une idée en fait
              <br className="motion-reduce:transition-none" />
              naître une autre.
            </h2>
            <p className="motion-reduce:transition-none m-0 text-[13px] leading-[1.85] text-[#c9d6ed] max-w-80">
              Une création vous inspire ? Ouvrez-la dans l’atelier et donnez-lui
              votre propre direction.
            </p>
            <span className="home-next-action group/home-next-action gap-3.5 inline-flex items-center text-xs leading-[inherit] font-[650] mt-7 motion-reduce:transition-none">
              Découvrir la galerie
              <span className="home-next-arrow group/home-next-arrow grid place-items-center shrink-0 rounded-full bg-[#ffffff14] [transition:background_150ms,color_150ms] size-8 motion-reduce:transition-none group-hover/home-gallery-link:bg-white group-hover/home-gallery-link:text-[#243d77] motion-reduce:duration-0">
                <ArrowUpRight
                  className="motion-reduce:transition-none"
                  size={18}
                  aria-hidden="true"
                />
              </span>
            </span>
          </div>
          <HomeNextArt className="motion-reduce:transition-none" kind="fork" />
        </Link>
        <Link
          to="/projects"
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 home-projects-link px-8 py-7 overflow-hidden border border-solid border-[#dfe7f3] min-w-0 rounded-[22px] relative flex flex-col items-start [background:linear-gradient(145deg,#edf3fc,#f8faff)] max-sm-narrow:px-7 min-sm-narrow:max-lg-narrow:pr-47.5 motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4 group/home-projects-link motion-reduce:duration-0"
        >
          <HomeNextArt
            className="motion-reduce:transition-none"
            kind="collection"
          />
          <h2 className="motion-reduce:transition-none mx-0 font-extrabold tracking-[-1px] mt-0 mb-4 max-sm-narrow:text-[28px] text-[28px] leading-[1.18]">
            Vos idées,
            <br className="motion-reduce:transition-none" />
            au même endroit.
          </h2>
          <p className="motion-reduce:transition-none m-0 text-[13px] leading-[1.85] max-w-80 text-[#65758e] mb-6">
            Petites expériences et grandes constructions : retrouvez votre
            collection et reprenez là où vous en étiez.
          </p>
          <span className="home-next-action group/home-next-action gap-3.5 inline-flex items-center text-xs leading-[inherit] font-[650] motion-reduce:transition-none text-[#356ae6] mt-auto">
            Mes créations
            <span className="home-next-arrow group/home-next-arrow grid place-items-center shrink-0 rounded-full [transition:background_150ms,color_150ms] size-8 motion-reduce:transition-none bg-white group-hover/home-projects-link:bg-[#356ae6] group-hover/home-projects-link:text-white motion-reduce:duration-0">
              <ArrowUpRight
                className="motion-reduce:transition-none"
                size={18}
                aria-hidden="true"
              />
            </span>
          </span>
        </Link>
      </section>
    </main>
  );
}
