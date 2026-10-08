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
        className="auth-cube-left fill-[var(--cube-left)]"
        d="M-32 0 0 18V56L-32 38Z"
      />
      <path
        className="auth-cube-right fill-[var(--cube-right)]"
        d="M0 18 32 0V38L0 56Z"
      />
      <path
        className="auth-cube-top fill-[var(--cube-top)]"
        d="m0-18 32 18-32 18-32-18Z"
      />
      <path
        d="M-32 0 0 18 32 0M0 18V56"
        fill="none"
        stroke="#fff"
        strokeOpacity=".2"
      />
      <path
        className="auth-cube-right fill-[var(--cube-right)]"
        d="M-11-6V0a11 6 0 0 0 22 0V-6Z"
      />
      <ellipse
        className="auth-cube-top fill-[var(--cube-top)]"
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
      className="auth-construction block w-full h-auto max-h-80"
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
    <main className="auth-page px-10 mx-auto my-0 max-w-310 pt-14 pb-7 [@media(width<=440px)]:px-3.5 [@media(width<=440px)]:py-5.5 [@media(width<=440px)]:max-w-135 [@media(440px<width<=800px)]:px-5.5 [@media(440px<width<=800px)]:max-w-135 [@media(440px<width<=800px)]:pt-7.5 [@media(440px<width<=800px)]:pb-6 [@media(800px<width<=1000px)]:px-7 [@media(800px<width<=1000px)]:pt-9 [@media(800px<width<=1000px)]:pb-6">
      <div className="auth-layout overflow-hidden border border-solid border-[#dfe7f4] grid grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] rounded-[26px] [background:radial-gradient(ellipse_at_35%_40%,#fff9ef_0%,transparent_50%),linear-gradient(145deg,#f0f5ff,#f8faff_65%,#edf3ff)] [box-shadow:0_16px_48px_#233f750c] [@media(width<=440px)]:block [@media(width<=440px)]:grid-cols-2 [@media(width<=440px)]:rounded-[17px] [@media(440px<width<=800px)]:block [@media(440px<width<=800px)]:grid-cols-2 [@media(800px<width<=1000px)]:grid-cols-2">
        <aside
          className="auth-story px-9 overflow-hidden flex flex-col min-w-0 pt-10 pb-8 [@media(width<=800px)]:px-5.5 [@media(width<=800px)]:hidden [@media(width<=800px)]:pt-6.5 [@media(width<=800px)]:pb-5.5 [@media(800px<width<=1000px)]:px-5.5 [@media(800px<width<=1000px)]:pt-6.5 [@media(800px<width<=1000px)]:pb-5.5"
          aria-label="Votre espace Clik"
        >
          <h2 className="mx-0 mt-6 mb-4 text-[clamp(32px,_3.4vw,_44px)] font-[850] tracking-[-1.8px] leading-[1.14] [@media(width<=1000px)]:text-[32px] [@media(width<=1000px)]:tracking-[-1.3px]">
            De petites briques.
            <br />
            <em className="not-italic text-[#356ae6]">De grandes idées.</em>
          </h2>
          <p className="m-0 max-w-88.75 text-[#617594] text-sm leading-[1.75]">
            Assemblez, recommencez, inventez. Votre prochain monde commence par
            une idée, et quelques briques.
          </p>
          <div className="auth-story-art -mx-5 flex-1 content-center mt-0.5 mb-6.75">
            <StoryConstruction />
            <p className="auth-story-caption mx-5 -mt-1.5 mb-0 text-center text-[#6b7e9b] text-[11px]">
              Un peu d’imagination. Et tout prend forme.
            </p>
          </div>
          <ul className="auth-benefits px-0 m-0 gap-3.5 grid grid-cols-3 pt-5.5 pb-0 border-t border-solid border-t-[#dce5f3] list-none [@media(width<=1000px)]:gap-2.25">
            <li className="gap-2.25 flex flex-col items-start text-[11px] leading-[1.6] text-[#617594]">
              <Cloud
                className="text-[#527dc9] shrink-0"
                size={18}
                aria-hidden="true"
              />
              <span>
                <strong className="block mb-px text-[#344d73] text-xs leading-[inherit] font-[650]">
                  Retrouvez
                </strong>{" "}
                vos créations partout
              </span>
            </li>
            <li className="gap-2.25 flex flex-col items-start text-[11px] leading-[1.6] text-[#617594]">
              <FolderHeart
                className="text-[#527dc9] shrink-0"
                size={18}
                aria-hidden="true"
              />
              <span>
                <strong className="block mb-px text-[#344d73] text-xs leading-[inherit] font-[650]">
                  Explorez
                </strong>{" "}
                toutes vos idées
              </span>
            </li>
            <li className="gap-2.25 flex flex-col items-start text-[11px] leading-[1.6] text-[#617594]">
              <Globe
                className="text-[#527dc9] shrink-0"
                size={18}
                aria-hidden="true"
              />
              <span>
                <strong className="block mb-px text-[#344d73] text-xs leading-[inherit] font-[650]">
                  Partagez
                </strong>{" "}
                votre univers
              </span>
            </li>
          </ul>
        </aside>
        <section
          className="auth-card px-[clamp(32px,4vw,56px)] py-10 flex flex-col justify-center min-w-0 border-l border-solid border-l-[#e1e8f5] bg-[#ffffffb3] [@media(width<=440px)]:px-5.25 [@media(width<=440px)]:py-6.25 [@media(width<=440px)]:[border-left-width:0] [@media(width<=440px)]:border-l-[currentColor] [@media(440px<width<=800px)]:px-6.5 [@media(440px<width<=800px)]:py-8 [@media(440px<width<=800px)]:[border-left-width:0] [@media(440px<width<=800px)]:border-l-[currentColor] [@media(800px<width<=1000px)]:px-6.5 [@media(800px<width<=1000px)]:py-8"
          aria-labelledby="auth-title"
        >
          <div className="auth-card-heading mb-6.75 [@media(width<=440px)]:mb-5.75">
            <h1
              className="mx-0 mt-0 mb-3.25 text-[32px] font-extrabold tracking-[-1.1px] leading-[1.16] outline-none [@media(width<=440px)]:text-[29px]"
              ref={heading}
              id="auth-title"
              tabIndex={-1}
            >
              {title}
              {!/[?!]$/.test(title) && (
                <span className="text-[#356ae6]">.</span>
              )}
            </h1>
            <p className="text-[#6b7b94] text-sm leading-[1.75]">
              {description}
            </p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
