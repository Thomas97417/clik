import { cn } from "@/lib/utils";
import { useEffect, useRef, type ReactNode } from "react";
import { Cloud, FolderHeart, Globe } from "lucide-react";

function StoryCube({
  x,
  y,
  tone = "blue",
  rotation = 0,
  scale = 1,
}: {
  x: number;
  y: number;
  tone?: "blue" | "sky" | "peach" | "cream";
  rotation?: number;
  scale?: number;
}) {
  return (
    <g
      className={cn(
        "auth-cube [--cube-top:#7ba5ff] [--cube-left:#4c7ee8] [--cube-right:#3562c4]",
        tone === "blue" && "auth-cube-blue",
        tone === "sky" &&
          "auth-cube-sky [--cube-top:#d7e7ff] [--cube-left:#a9c6f4] [--cube-right:#84a9e0]",
        tone === "peach" &&
          "auth-cube-peach [--cube-top:#ffd0b4] [--cube-left:#f2ab87] [--cube-right:#d88866]",
        tone === "cream" &&
          "auth-cube-cream [--cube-top:#fffaf0] [--cube-left:#eae0cd] [--cube-right:#d1c4ad]",
      )}
      transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}
      strokeLinejoin="round"
    >
      <path
        className={cn("auth-cube-left fill-[var(--cube-left)]")}
        d="M-32 0 0 18V56L-32 38Z"
      />
      <path
        className={cn("auth-cube-right fill-[var(--cube-right)]")}
        d="M0 18 32 0V38L0 56Z"
      />
      <path
        className={cn("auth-cube-top fill-[var(--cube-top)]")}
        d="m0-18 32 18-32 18-32-18Z"
      />
      <path
        d="M-32 0 0 18 32 0M0 18V56"
        fill="none"
        stroke="#fff"
        strokeOpacity=".2"
      />
      <path
        className={cn("auth-cube-right fill-[var(--cube-right)]")}
        d="M-11-6V0a11 6 0 0 0 22 0V-6Z"
      />
      <ellipse
        className={cn("auth-cube-top fill-[var(--cube-top)]")}
        cy="-6"
        rx="11"
        ry="6"
        stroke="#fff"
        strokeOpacity=".35"
      />
    </g>
  );
}

function StoryConstruction() {
  return (
    <svg
      className={cn("auth-construction block w-[100%] h-[auto] max-h-[320px]")}
      viewBox="0 0 480 320"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* A small, unfinished assembly, with pieces still waiting to find a place. */}
      <ellipse
        cx="247"
        cy="253"
        rx="130"
        ry="35"
        fill="#356ae6"
        opacity=".045"
      />
      <g stroke="#c5d4ed" strokeWidth="1" strokeLinecap="round">
        <path
          d="m113 214 135 76 142-80M153 191l135 76M193 169l135 76M153 236l142-80M193 258l142-80"
          opacity=".65"
        />
        <path d="m88 116 5-3m-5 3 5 3m-5-3v6M387 105l5-3m-5 3 5 3m-5-3v6M352 284l5-3m-5 3 5 3m-5-3v6" />
      </g>
      <ellipse cx="94" cy="253" rx="33" ry="10" fill="#dce4f2" opacity=".6" />
      <ellipse cx="392" cy="246" rx="32" ry="10" fill="#dce4f2" opacity=".6" />
      <StoryCube x={132} y={115} tone="cream" rotation={-12} scale={0.66} />
      <StoryCube x={349} y={148} tone="sky" rotation={10} scale={0.75} />
      <StoryCube x={246} y={163} tone="sky" />
      <StoryCube x={214} y={181} />
      <StoryCube x={278} y={181} tone="sky" />
      <StoryCube x={246} y={199} tone="cream" />
      <StoryCube x={214} y={143} />
      <g
        stroke="#8ca9dc"
        strokeWidth="1.25"
        strokeDasharray="4 5"
        strokeLinejoin="round"
      >
        <path d="m278 125 32 18v38l-32 18-32-18v-38Zm-32 18 32 18 32-18m-32 18v38" />
        <path d="M246 106v24m64-24v24M278 124v24" opacity=".6" />
      </g>
      <StoryCube x={278} y={66} tone="peach" />
      <StoryCube x={91} y={204} tone="peach" rotation={-14} scale={0.8} />
      <StoryCube x={391} y={197} rotation={14} scale={0.78} />
    </svg>
  );
}

export default function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const previousTitle = useRef(title);
  useEffect(() => {
    if (previousTitle.current !== title) heading.current?.focus();
    previousTitle.current = title;
  }, [title]);
  return (
    <main
      className={cn(
        "auth-page px-[40px] mx-[auto] my-[0] max-w-[1240px] pt-[56px] pb-[28px] [@media(width<=440px)]:px-[14px] [@media(width<=440px)]:py-[22px] [@media(width<=440px)]:max-w-[540px] [@media(440px<width<=800px)]:px-[22px] [@media(440px<width<=800px)]:max-w-[540px] [@media(440px<width<=800px)]:pt-[30px] [@media(440px<width<=800px)]:pb-[24px] [@media(800px<width<=1000px)]:px-[28px] [@media(800px<width<=1000px)]:pt-[36px] [@media(800px<width<=1000px)]:pb-[24px]",
      )}
    >
      <div
        className={cn(
          "auth-layout overflow-hidden border-[length:1px] border-solid border-[color:#dfe7f4] grid grid-cols-[minmax(0,_1.08fr)_minmax(0,_1fr)] rounded-[26px] [background:radial-gradient(ellipse_at_35%_40%,_#fff9ef_0%,_transparent_50%),_linear-gradient(145deg,_#f0f5ff,_#f8faff_65%,_#edf3ff)] [box-shadow:0_16px_48px_#233f750c] [@media(width<=440px)]:block [@media(width<=440px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=440px)]:rounded-[17px] [@media(440px<width<=800px)]:block [@media(440px<width<=800px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(800px<width<=1000px)]:grid-cols-[repeat(2,_minmax(0,_1fr))]",
        )}
      >
        <aside
          className={cn(
            "auth-story px-[36px] overflow-hidden flex flex-col min-w-[0] pt-[40px] pb-[32px] [@media(width<=800px)]:px-[22px] [@media(width<=800px)]:hidden [@media(width<=800px)]:pt-[26px] [@media(width<=800px)]:pb-[22px] [@media(800px<width<=1000px)]:px-[22px] [@media(800px<width<=1000px)]:pt-[26px] [@media(800px<width<=1000px)]:pb-[22px] [&_h2]:mx-[0] [&_h2]:mt-[24px] [&_h2]:mb-[16px] [&_h2]:[font-size:clamp(32px,_3.4vw,_44px)] [&_h2]:font-[850] [&_h2]:tracking-[-1.8px] [&_h2]:leading-[1.14] [@media(width<=1000px)]:[&_h2]:[font-size:32px] [@media(width<=1000px)]:[&_h2]:tracking-[-1.3px] [&_h2_em]:not-italic [&_h2_em]:text-[color:#356ae6] [&_>_p]:m-[0] [&_>_p]:max-w-[355px] [&_>_p]:text-[color:#617594] [&_>_p]:leading-[1.75] [&_>_p]:[font-size:14px]",
          )}
          aria-label="Votre espace Clik"
        >
          <h2>
            De petites briques.
            <br />
            <em>De grandes idées.</em>
          </h2>
          <p>
            Assemblez, recommencez, inventez. Votre prochain monde commence par
            une idée, et quelques briques.
          </p>
          <div
            className={cn(
              "auth-story-art mx-[-20px] flex-[1] [align-content:center] mt-[2px] mb-[27px]",
            )}
          >
            <StoryConstruction />
            <p
              className={cn(
                "auth-story-caption mx-[20px] mt-[-6px] mb-[0] text-center text-[color:#6b7e9b] [font-size:11px]",
              )}
            >
              Un peu d’imagination. Et tout prend forme.
            </p>
          </div>
          <ul
            className={cn(
              "auth-benefits px-[0] m-[0] gap-[14px] grid grid-cols-[repeat(3,_minmax(0,_1fr))] pt-[22px] pb-[0] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dce5f3] list-none [@media(width<=1000px)]:gap-[9px] [&_li]:gap-[9px] [&_li]:flex [&_li]:flex-col [&_li]:items-start [&_li]:[font-size:11px] [&_li]:leading-[1.6] [&_li]:text-[color:#617594] [&_strong]:block [&_strong]:mb-[1px] [&_strong]:text-[color:#344d73] [&_strong]:[font-size:12px] [&_strong]:font-[650] [&_svg]:text-[color:#527dc9] [&_svg]:shrink-[0]",
            )}
          >
            <li>
              <Cloud size={18} aria-hidden="true" />
              <span>
                <strong>Retrouvez</strong> vos créations partout
              </span>
            </li>
            <li>
              <FolderHeart size={18} aria-hidden="true" />
              <span>
                <strong>Explorez</strong> toutes vos idées
              </span>
            </li>
            <li>
              <Globe size={18} aria-hidden="true" />
              <span>
                <strong>Partagez</strong> votre univers
              </span>
            </li>
          </ul>
        </aside>
        <section
          className={cn(
            "auth-card px-[clamp(32px,_4vw,_56px)] py-[40px] flex flex-col justify-center min-w-[0] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e1e8f5] bg-[#ffffffb3] [@media(width<=440px)]:px-[21px] [@media(width<=440px)]:py-[25px] [@media(width<=440px)]:[border-left-width:0] [@media(width<=440px)]:[border-left-style:none] [@media(width<=440px)]:[border-left-color:currentColor] [@media(440px<width<=800px)]:px-[26px] [@media(440px<width<=800px)]:py-[32px] [@media(440px<width<=800px)]:[border-left-width:0] [@media(440px<width<=800px)]:[border-left-style:none] [@media(440px<width<=800px)]:[border-left-color:currentColor] [@media(800px<width<=1000px)]:px-[26px] [@media(800px<width<=1000px)]:py-[32px] [&_h1]:mx-[0] [&_h1]:mt-[0] [&_h1]:mb-[13px] [&_h1]:[font-size:32px] [&_h1]:font-[800] [&_h1]:tracking-[-1.1px] [&_h1]:leading-[1.16] [&_h1]:[outline:none] [@media(width<=440px)]:[&_h1]:[font-size:29px] [&_h1_>_span]:text-[color:#356ae6] [&_a:not([class~='group/auth-submit']):hover]:text-[color:#2458ce] [&_a:not([class~='group/auth-submit']):hover]:[text-decoration:underline] [&_a:not([class~='group/auth-submit']):hover]:underline-offset-[3px]",
          )}
          aria-labelledby="auth-title"
        >
          <div
            className={cn(
              "auth-card-heading [&_>_p]:text-[color:#6b7b94] [&_>_p]:[font-size:14px] [&_>_p]:leading-[1.75] mb-[27px] [@media(width<=440px)]:mb-[23px]",
            )}
          >
            <h1 ref={heading} id="auth-title" tabIndex={-1}>
              {title}
              {!/[?!]$/.test(title) && <span>.</span>}
            </h1>
            <p>{description}</p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
