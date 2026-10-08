import { cn } from "@/lib/utils";
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
    <main
      className={cn(
        "home px-[5%] py-[0] m-[auto] max-w-[1440px] [@media(width<=850px)]:px-[6%] [&_[class~='group/primary-link']]:min-h-[48px] [&_button:disabled]:opacity-[0.6] [&_button:disabled]:cursor-[wait] [@media(width<=520px)]:[&_[class~='group/eyebrow']]:[font-size:10px] [@media(width<=520px)]:[&_[class~='group/eyebrow']]:tracking-[1.2px] motion-reduce:[&_*]:[scroll-behavior:auto] motion-reduce:[&_*]:[transition:none] motion-reduce:[&_*::before]:[scroll-behavior:auto] motion-reduce:[&_*::before]:[transition:none] motion-reduce:[&_*::after]:[scroll-behavior:auto] motion-reduce:[&_*::after]:[transition:none]",
      )}
    >
      <section
        className={cn(
          "home-hero px-[0] gap-[clamp(28px,_4vw,_64px)] grid grid-cols-[0.92fr_1.08fr] items-center pt-[64px] pb-[48px] [@media(width<=850px)]:gap-[36px] [@media(width<=850px)]:grid-cols-[1fr] [@media(width<=850px)]:pt-[42px] [@media(width<=850px)]:pb-[32px] [@media(850px<width<=1100px)]:gap-[28px] [@media(850px<width<=1100px)]:pt-[48px]",
        )}
        aria-labelledby="home-title"
      >
        <div
          className={cn(
            "home-copy [&_h1]:mx-[0] [&_h1]:my-[24px] [&_h1]:[font-size:clamp(52px,_5.5vw,_82px)] [&_h1]:leading-[1.02] [&_h1]:tracking-[-4px] [&_h1]:font-[850] [@media(width<=520px)]:[&_h1]:my-[22px] [@media(width<=520px)]:[&_h1]:[font-size:clamp(40px,_11vw,_56px)] [@media(width<=520px)]:[&_h1]:tracking-[-2.5px] [@media(520px<width<=850px)]:[&_h1]:[font-size:64px] [@media(520px<width<=850px)]:[&_h1]:tracking-[-3px] [@media(850px<width<=1100px)]:[&_h1]:[font-size:62px] [&_em]:not-italic [&_em]:text-[color:#356ae6] [&_>_p]:max-w-[390px] [&_>_p]:[font-size:16px] [&_>_p]:text-[color:#697a93] [&_>_p]:leading-[1.85] [@media(width<=850px)]:[&_>_p]:max-w-[480px] [@media(width<=850px)]:[&_>_p]:[font-size:15px] [&_[class~='group/home-device-note']]:gap-[7px] [&_[class~='group/home-device-note']]:hidden [&_[class~='group/home-device-note']]:items-center [&_[class~='group/home-device-note']]:[font-size:11px] [&_[class~='group/home-device-note']]:leading-[1.7] [@media(width<=850px)]:[&_[class~='group/home-device-note']]:flex [@media(width<=850px)]:[&_[class~='group/home-device-note']]:mt-[5px] [@media(width<=850px)]:max-w-[580px] [@media(width<=850px)]:[&_h1_br:last-of-type]:hidden",
          )}
        >
          <h1 id="home-title">
            Un petit clik<em>.</em>
            <br />
            Une <em>grande</em>
            <br /> <em>idée.</em>
          </h1>
          <p>
            Un atelier de construction en briques 3D, dans votre navigateur.
            Donnez forme à ce que vous avez en tête, brique après brique.
          </p>
          <div
            className={cn(
              "home-buttons home-desktop-actions [@media(width<=850px)]:hidden mx-[0] flex flex-wrap items-center gap-y-[18px] gap-x-[24px] mt-[28px] mb-[18px]",
            )}
          >
            <button
              className={cn(
                "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
              )}
              disabled={busy}
              onClick={() => void create(false)}
            >
              <Plus size={18} aria-hidden="true" /> Créer une construction
            </button>
            <Link
              to="/gallery"
              className={cn(
                "home-text-link gap-[7px] inline-flex items-center [font-size:13px] font-[650] text-[color:#405575] [&:hover]:text-[color:#2458ce]",
              )}
            >
              Explorer la galerie <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div
            className={cn(
              "home-mobile-actions hidden [@media(width<=850px)]:mx-[0] [@media(width<=850px)]:block [@media(width<=850px)]:mt-[24px] [@media(width<=850px)]:mb-[15px]",
            )}
          >
            <Link
              to="/gallery"
              className={cn(
                "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
              )}
            >
              Explorer la galerie <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <p className={cn("home-device-note group/home-device-note")}>
            <Monitor size={15} aria-hidden="true" /> Pour construire, ouvrez
            l’atelier sur ordinateur.
          </p>
          <Link
            to="/projects"
            className={cn(
              "home-resume [&:hover]:text-[color:#2458ce] gap-[9px] inline-flex items-center text-[color:#657895] [font-size:12px] font-[550] mt-[28px] [@media(width<=850px)]:mt-[20px] [&_svg:last-child]:ml-[6px]",
            )}
          >
            <FolderOpen size={17} aria-hidden="true" /> Retrouver mes créations{" "}
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div
          className={cn(
            "home-playground overflow-hidden border-[length:1px] border-solid border-[color:#dfe5f0] min-w-[0] rounded-[22px] bg-[#fff] [box-shadow:0_24px_65px_-35px_#7185b454] [@media(width<=520px)]:rounded-[16px]",
          )}
        >
          <div
            className={cn(
              "home-model-viewer [background:radial-gradient(_ellipse_at_50%_45%,_#fff_0%,_#f3f6fc_65%,_#edf2fa_)]",
            )}
          >
            <div
              className={cn(
                "home-model-options px-[16px] gap-[4px] flex items-center justify-center pt-[12px] pb-[0] [@media(width<=520px)]:px-[8px] [@media(width<=520px)]:gap-[2px] [@media(width<=520px)]:pt-[8px] [&_button]:px-[14px] [&_button]:py-[8px] [&_button]:gap-[7px] [&_button]:relative [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:min-h-[40px] [&_button]:rounded-[8px] [&_button]:text-[color:#667894] [&_button]:[font-size:12px] [&_button]:font-[550] [&_button]:[transition:background_150ms,_color_150ms] [@media(width<=520px)]:[&_button]:px-[10px] [@media(width<=520px)]:[&_button]:gap-[6px] [@media(width<=520px)]:[&_button]:min-h-[44px] [@media(width<=520px)]:[&_button]:[font-size:11px] [&_button_svg]:shrink-[0] [&_button::after]:absolute [&_button::after]:bottom-[2px] [&_button::after]:left-[14px] [&_button::after]:right-[14px] [&_button::after]:h-[2px] [&_button::after]:rounded-[2px] [&_button::after]:bg-[#356ae6] [&_button::after]:[content:''] [&_button::after]:opacity-[0] [&_button:hover]:bg-[#ffffffa6] [&_button:hover]:text-[color:#345fbb] [&_button[aria-pressed='true']]:bg-[#ffffffb3] [&_button[aria-pressed='true']]:text-[color:#285abd] [&_button[aria-pressed='true']::after]:opacity-[1] [&_button:focus-visible]:[outline:2px_solid_#356ae6] [&_button:focus-visible]:[outline-offset:3px]",
              )}
              role="group"
              aria-label="Choisir un modèle"
            >
              {STARTER_MODELS.map((item, index) => {
                const Icon = modelIcons[index];
                return (
                  <button
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
                    <Icon size={15} aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div
              className={cn(
                "home-model-stage overflow-hidden h-[clamp(280px,_25vw,_350px)] relative isolate [@media(width<=520px)]:h-[290px] [@media(520px<width<=850px)]:h-[380px] [&_[class~='group/creation-preview']]:top-[0] [&_[class~='group/creation-preview']]:right-[10px] [&_[class~='group/creation-preview']]:bottom-[16px] [&_[class~='group/creation-preview']]:left-[10px] [@media(width<=520px)]:[&_[class~='group/creation-preview']]:right-[4px] [@media(width<=520px)]:[&_[class~='group/creation-preview']]:bottom-[12px] [@media(width<=520px)]:[&_[class~='group/creation-preview']]:left-[4px] [&_[class~='group/creation-preview']_img]:w-[100%] [&_[class~='group/creation-preview']_img]:h-[100%] [&_[class~='group/creation-preview']_img]:object-contain [&_[class~='group/creation-preview']_img]:[filter:drop-shadow(0_16px_12px_#37436918)] [&_[class~='group/creation-preview']_canvas]:w-[100%] [&_[class~='group/creation-preview']_canvas]:h-[100%] [&_[class~='group/creation-preview']_canvas]:object-contain [&_[class~='group/creation-preview']_canvas]:[filter:drop-shadow(0_16px_12px_#37436918)] [@media(width<=520px)]:[&_[class~='group/creation-preview-controls']]:right-[8px]",
              )}
              id="home-model-preview"
            >
              <div
                className={cn(
                  "home-model-halo border-[length:1px] border-solid border-[color:#dce5f580] absolute w-[75%] h-[65%] rounded-[50%] left-[50%] top-[50%] [transform:translate(-50%,_-50%)_rotate(-18deg)] z-[-1]",
                )}
                aria-hidden="true"
              />
              <CreationPreview
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
          <div
            className={cn(
              "home-palette-row px-[24px] py-[13px] gap-[12px] flex items-center justify-between [border-top-width:1px] [border-top-style:solid] [border-top-color:#e9eef7] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e9eef7] bg-[#fafbfe] [@media(width<=520px)]:px-[16px] [@media(width<=520px)]:py-[14px] [@media(width<=520px)]:flex-wrap [&_>_span]:text-[color:#6c7d98] [&_>_span]:[font-size:11px]",
            )}
          >
            <span>Couleur d’accent</span>
            <div
              className={cn(
                "home-palette gap-[12px] flex items-center [@media(width<=520px)]:gap-[11px] [&_button]:grid [&_button]:[place-items:center] [&_button]:w-[26px] [&_button]:h-[26px] [&_button]:bg-[var(--swatch)] [&_button]:text-[color:white] [&_button]:rounded-[50%] [&_button]:[transition:transform_150ms] [@media(width<=520px)]:[&_button]:w-[28px] [@media(width<=520px)]:[&_button]:h-[28px] [&_button:hover]:[transform:scale(1.1)] [&_button[aria-pressed='true']]:[outline:2px_solid_var(--swatch)] [&_button[aria-pressed='true']]:[outline-offset:3px] [&_button:focus-visible]:[outline:2px_solid_#202b41] [&_button:focus-visible]:[outline-offset:4px]",
              )}
              role="group"
              aria-label="Couleur du modèle"
            >
              {STARTER_COLORS.map((swatch) => (
                <button
                  key={swatch.value}
                  style={{ "--swatch": swatch.value } as CSSProperties}
                  aria-label={swatch.name}
                  aria-pressed={color === swatch.value}
                  title={swatch.name}
                  onClick={() => setColor(swatch.value)}
                >
                  {color === swatch.value && (
                    <Check size={17} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div
            className={cn(
              "home-model-details px-[24px] gap-[16px] flex items-start justify-between pt-[20px] pb-[18px] min-h-[110px] [@media(width<=520px)]:px-[18px] [@media(width<=520px)]:gap-[12px] [@media(width<=520px)]:min-h-[84px] [@media(width<=520px)]:flex-wrap [@media(520px<width<=850px)]:px-[18px] [@media(520px<width<=850px)]:gap-[4px] [@media(520px<width<=850px)]:min-h-[84px] [@media(520px<width<=850px)]:flex-wrap [@media(850px<width<=1100px)]:px-[18px] [@media(850px<width<=1100px)]:gap-[4px] [@media(850px<width<=1100px)]:flex-wrap [&_h2]:[font-size:16px] [&_h2]:font-[750] [&_h2]:mb-[6px] [&_p]:[font-size:12px] [&_p]:leading-[1.65] [&_p]:text-[color:#7a879d] [&_p]:max-w-[330px] [@media(width<=1100px)]:[&_p]:max-w-[none]",
            )}
            aria-live="polite"
          >
            <div>
              <h2>{model.name}</h2>
              <p>{model.description}</p>
            </div>
            <span
              className={cn(
                "home-model-count px-[8px] py-[5px] gap-[5px] inline-flex items-center shrink-[0] mt-[2px] rounded-[6px] bg-[#f3f6fb] text-[color:#657893] [font-size:10px]",
              )}
            >
              <Blocks size={14} aria-hidden="true" /> {scene.nodes.length}{" "}
              pièces
            </span>
          </div>
          <div
            className={cn(
              "home-fork home-desktop-actions [@media(width<=850px)]:hidden relative pt-[0] pr-[24px] pb-[22px] pl-[70px]",
            )}
          >
            <svg
              className={cn(
                "home-fork-path absolute left-[22px] top-[0] w-[38px] h-[95px] stroke-[#becce3] [stroke-width:2] [stroke-linecap:round] [&_circle]:fill-[white]",
              )}
              viewBox="0 0 44 100"
              fill="none"
              aria-hidden="true"
            >
              <path
                className={cn("home-fork-original [stroke-dasharray:3_5]")}
                d="M8 9v80"
              />
              <path
                className={cn("home-fork-branch stroke-[#356ae6]")}
                d="M8 9v18c0 24 28 12 28 36v12"
              />
              <circle cx="8" cy="9" r="4" />
              <circle
                className={cn("home-fork-end stroke-[#356ae6]")}
                cx="36"
                cy="79"
                r="4"
              />
            </svg>
            <span
              className={cn(
                "home-fork-source px-[0] block pt-[2px] pb-[12px] text-[color:#8391a7] [font-size:11px]",
              )}
            >
              Le modèle est le point de départ.
            </span>
            <button
              className={cn(
                "home-model-start [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px] px-[15px] py-[13px] gap-[10px] border-[length:1px] border-solid border-[color:#d4e0fb] flex items-center justify-between w-[100%] text-left text-[color:#356ae6] rounded-[12px] bg-[#f1f5ff] [transition:background_150ms,_border-color_150ms] [&_strong]:gap-[7px] [&_strong]:flex [&_strong]:items-center [&_strong]:[font-size:13px] [&_strong]:font-[650] [&_span_>_span]:block [&_span_>_span]:mt-[5px] [&_span_>_span]:text-[color:#7082a2] [&_span_>_span]:[font-size:11px] [&_span_>_span]:leading-[1.5] [&_>_svg]:shrink-[0] [&:hover]:border-[color:#a6bfee] [&:hover]:bg-[#e7efff]",
              )}
              aria-label={busy ? "Ouverture…" : "Créer ma version"}
              disabled={busy}
              onClick={() => void create(true)}
            >
              <span>
                <strong>
                  <GitBranch size={16} aria-hidden="true" />{" "}
                  {busy ? "Ouverture…" : "Créer ma version"}
                </strong>
                <span>Une copie à transformer. Une nouvelle direction.</span>
              </span>
              <ArrowUpRight size={19} aria-hidden="true" />
            </button>
          </div>
          {error && (
            <p
              className={cn(
                "home-start-error p-[12px] mx-[20px] mt-[0] mb-[20px] rounded-[8px] bg-[#fff3ed] text-[color:#9a3c24] [font-size:12px] leading-[1.7]",
              )}
              role="alert"
            >
              Impossible d’ouvrir la création. Vérifiez que le stockage de votre
              navigateur est disponible, puis réessayez.
            </p>
          )}
        </div>
      </section>

      <div
        className={cn(
          "home-discover-bar px-[0] py-[22px] gap-[32px] flex items-center [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e6ef] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e6ef] text-[color:#74819a] [font-size:12px] [@media(width<=520px)]:gap-y-[18px] [@media(width<=520px)]:gap-x-[8px] [@media(width<=520px)]:[font-size:11px] [@media(width<=520px)]:flex-wrap [@media(width<=520px)]:justify-between [@media(520px<width<=850px)]:gap-[18px] [@media(520px<width<=850px)]:[font-size:11px] [@media(520px<width<=850px)]:flex-wrap [&_>_span]:gap-[9px] [&_>_span]:flex [&_>_span]:items-center [&_button]:gap-[9px] [&_button]:flex [&_button]:items-center [&_button]:ml-[auto] [&_button]:font-[600] [&_button]:text-[color:#405575] [&_button]:min-h-[24px] [@media(width<=520px)]:[&_button]:ml-[0] [@media(width<=520px)]:[&_button]:w-[100%] [@media(width<=520px)]:[&_button]:justify-center [@media(width<=520px)]:[&_button]:pt-[3px]",
        )}
      >
        <span>
          <Blocks size={17} aria-hidden="true" /> {Object.keys(CATALOG).length}{" "}
          formes à assembler
        </span>
        <span>
          <Palette size={17} aria-hidden="true" /> {COLORS.length} couleurs à
          mélanger
        </span>
        <button
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
          Comment ça marche <ArrowDown size={16} aria-hidden="true" />
        </button>
      </div>

      <section
        ref={steps}
        tabIndex={-1}
        className={cn(
          "home-how px-[0] py-[72px] [scroll-margin-top:28px] [@media(width<=850px)]:py-[48px] [&:focus]:[outline:none]",
        )}
        aria-labelledby="home-how-title"
      >
        <div
          className={cn(
            "home-section-heading [&_em]:not-italic [&_em]:text-[color:#356ae6] mb-[28px] [&_h2]:m-[0] [&_h2]:[font-size:clamp(30px,_3vw,_40px)] [&_h2]:leading-[1.2] [&_h2]:tracking-[-1.5px] [&_h2]:font-[800] [@media(width<=520px)]:[&_h2]:[font-size:30px] [@media(width<=520px)]:[&_h2]:max-w-[270px]",
          )}
        >
          <h2 id="home-how-title">
            Prenez le temps de <em>jouer.</em>
          </h2>
        </div>
        <div
          className={cn(
            "home-steps gap-[18px] grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=520px)]:gap-[14px] [@media(width<=520px)]:grid-cols-[1fr] [@media(520px<width<=850px)]:gap-[12px] [&_article]:px-[28px] [&_article]:border-[length:1px] [&_article]:border-solid [&_article]:border-[color:#e1e7f0] [&_article]:[--step-tint:#f3f7ff] [&_article]:[--step-ink:#5c7cb1] [&_article]:min-w-[0] [&_article]:pt-[24px] [&_article]:pb-[28px] [&_article]:rounded-[20px] [&_article]:[background:linear-gradient(155deg,_var(--step-tint),_#fff_65%)] [@media(width<=520px)]:[&_article]:p-[25px] [@media(520px<width<=850px)]:[&_article]:p-[20px] [@media(850px<width<=1100px)]:[&_article]:p-[22px] [&_article:nth-child(2)]:[--step-tint:#f8f3fd] [&_article:nth-child(2)]:[--step-ink:#9273b1] [&_article:nth-child(3)]:[--step-tint:#fff8ef] [&_article:nth-child(3)]:[--step-ink:#ad8054] [&_h3]:mx-[0] [&_h3]:[font-size:18px] [&_h3]:font-[750] [&_h3]:tracking-[-0.45px] [&_h3]:mt-[0] [&_h3]:mb-[11px] [&_h3]:leading-[1.35] [@media(width<=520px)]:[&_h3]:[font-size:17px] [@media(520px<width<=850px)]:[&_h3]:[font-size:15px] [&_p]:m-[0] [&_p]:[font-size:13px] [&_p]:leading-[1.85] [&_p]:text-[color:#65758e]",
          )}
        >
          <article>
            <div
              className={cn(
                "home-step-top gap-[8px] flex items-start justify-between mb-[14px] [@media(width<=520px)]:mb-[10px]",
              )}
            >
              <span
                className={cn(
                  "home-step-number border-[length:1px] border-solid border-[color:#ffffff] grid [place-items:center] shrink-[0] w-[30px] h-[30px] mt-[3px] rounded-[9px] bg-[#ffffffb3] text-[color:var(--step-ink)] [font-size:11px] font-[600] tabular-nums",
                )}
                aria-hidden="true"
              >
                01
              </span>
              <HomeStepArt step="build" />
            </div>
            <h3>Posez la première pièce.</h3>
            <p>
              Glissez une forme dans l’atelier. Les pièces s’aimantent pour vous
              aider à les assembler.
            </p>
          </article>
          <article>
            <div
              className={cn(
                "home-step-top gap-[8px] flex items-start justify-between mb-[14px] [@media(width<=520px)]:mb-[10px]",
              )}
            >
              <span
                className={cn(
                  "home-step-number border-[length:1px] border-solid border-[color:#ffffff] grid [place-items:center] shrink-[0] w-[30px] h-[30px] mt-[3px] rounded-[9px] bg-[#ffffffb3] text-[color:var(--step-ink)] [font-size:11px] font-[600] tabular-nums",
                )}
                aria-hidden="true"
              >
                02
              </span>
              <HomeStepArt step="play" />
            </div>
            <h3>Faites-la à votre façon.</h3>
            <p>
              Changez les couleurs, tournez, dupliquez. Essayez une autre
              direction : vous pouvez toujours annuler.
            </p>
          </article>
          <article>
            <div
              className={cn(
                "home-step-top gap-[8px] flex items-start justify-between mb-[14px] [@media(width<=520px)]:mb-[10px]",
              )}
            >
              <span
                className={cn(
                  "home-step-number border-[length:1px] border-solid border-[color:#ffffff] grid [place-items:center] shrink-[0] w-[30px] h-[30px] mt-[3px] rounded-[9px] bg-[#ffffffb3] text-[color:var(--step-ink)] [font-size:11px] font-[600] tabular-nums",
                )}
                aria-hidden="true"
              >
                03
              </span>
              <HomeStepArt step="share" />
            </div>
            <h3>Gardez-la. Ou partagez-la.</h3>
            <p>
              Retrouvez votre création sur cet appareil. Avec un compte,
              conservez-la en ligne et publiez-la quand vous le souhaitez.
            </p>
          </article>
        </div>
      </section>

      <section
        className={cn(
          "home-next gap-[20px] grid grid-cols-[1.6fr_1fr] pb-[64px] [@media(width<=850px)]:grid-cols-[1fr] [@media(width<=850px)]:pb-[44px] [&_h2]:mx-[0] [&_h2]:[font-size:clamp(26px,_2.6vw,_34px)] [&_h2]:leading-[1.18] [&_h2]:font-[800] [&_h2]:tracking-[-1px] [&_h2]:mt-[0] [&_h2]:mb-[16px] [@media(width<=520px)]:[&_h2]:[font-size:28px] [&_p]:m-[0] [&_p]:[font-size:13px] [&_p]:leading-[1.85] [&_p]:text-[color:#c9d6ed] [&_p]:max-w-[320px] [&_>_a:focus-visible]:[outline:3px_solid_#356ae6] [&_>_a:focus-visible]:[outline-offset:4px]",
        )}
        aria-label="Poursuivre l’aventure"
      >
        <Link
          to="/gallery"
          className={cn(
            "home-gallery-link p-[36px] gap-[20px] overflow-hidden min-w-[0] rounded-[22px] grid grid-cols-[minmax(0,_1fr)_minmax(180px,_0.8fr)] items-center [background:radial-gradient(ellipse_at_90%_15%,_#36538b,_transparent_65%),_#243d77] text-[color:white] [@media(width<=520px)]:p-[28px] [@media(width<=520px)]:gap-[26px] [@media(width<=520px)]:grid-cols-[1fr] [@media(520px<width<=850px)]:p-[28px] [@media(520px<width<=850px)]:gap-[16px] [@media(520px<width<=850px)]:grid-cols-[minmax(0,_1fr)_minmax(160px,_0.8fr)] [@media(850px<width<=1100px)]:p-[28px] [@media(850px<width<=1100px)]:gap-[16px] [@media(850px<width<=1100px)]:grid-cols-[minmax(0,_1fr)_minmax(130px,_0.75fr)] [&:hover_[class~='group/home-next-arrow']]:bg-[#fff] [&:hover_[class~='group/home-next-arrow']]:text-[color:#243d77]",
          )}
        >
          <div className={cn("home-next-copy flex flex-col items-start")}>
            <h2>
              Une idée en fait
              <br />
              naître une autre.
            </h2>
            <p>
              Une création vous inspire ? Ouvrez-la dans l’atelier et donnez-lui
              votre propre direction.
            </p>
            <span
              className={cn(
                "home-next-action group/home-next-action gap-[14px] inline-flex items-center [font-size:12px] font-[650] mt-[28px]",
              )}
            >
              Découvrir la galerie
              <span
                className={cn(
                  "home-next-arrow group/home-next-arrow grid [place-items:center] shrink-[0] w-[32px] h-[32px] rounded-[50%] bg-[#ffffff14] [transition:background_150ms,_color_150ms]",
                )}
              >
                <ArrowUpRight size={18} aria-hidden="true" />
              </span>
            </span>
          </div>
          <HomeNextArt kind="fork" />
        </Link>
        <Link
          to="/projects"
          className={cn(
            "home-projects-link px-[32px] py-[28px] overflow-hidden border-[length:1px] border-solid border-[color:#dfe7f3] min-w-[0] rounded-[22px] relative flex flex-col items-start [background:linear-gradient(145deg,_#edf3fc,_#f8faff)] [@media(width<=520px)]:px-[28px] [@media(520px<width<=850px)]:pr-[190px] [&&_h2]:[font-size:28px] [&&_p]:text-[color:#65758e] [&&_p]:mb-[24px] [&_[class~='group/home-next-action']]:text-[color:#356ae6] [&_[class~='group/home-next-action']]:mt-[auto] [&_[class~='group/home-next-arrow']]:bg-[#fff] [&:hover_[class~='group/home-next-arrow']]:bg-[#356ae6] [&:hover_[class~='group/home-next-arrow']]:text-[color:#fff]",
          )}
        >
          <HomeNextArt kind="collection" />
          <h2>
            Vos idées,
            <br />
            au même endroit.
          </h2>
          <p>
            Petites expériences et grandes constructions : retrouvez votre
            collection et reprenez là où vous en étiez.
          </p>
          <span
            className={cn(
              "home-next-action group/home-next-action gap-[14px] inline-flex items-center [font-size:12px] font-[650] mt-[28px]",
            )}
          >
            Mes créations
            <span
              className={cn(
                "home-next-arrow group/home-next-arrow grid [place-items:center] shrink-[0] w-[32px] h-[32px] rounded-[50%] bg-[#ffffff14] [transition:background_150ms,_color_150ms]",
              )}
            >
              <ArrowUpRight size={18} aria-hidden="true" />
            </span>
          </span>
        </Link>
      </section>
    </main>
  );
}
