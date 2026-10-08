import { Link, useLocation } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import UserMenu from "./user-menu";

const navigation = [
  { to: "/editor", label: "L’atelier", short: "Atelier", tone: "blue" },
  { to: "/gallery", label: "La galerie", short: "Galerie", tone: "peach" },
  { to: "/challenges", label: "Les défis", short: "Défis", tone: "lilac" },
  { to: "/projects", label: "Mes créations", short: "Créations", tone: "mint" },
] as const;

const compactQuery = "(max-width: 680px)";
function subscribeToCompactHeader(onChange: () => void) {
  const query = window.matchMedia(compactQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getCompactHeader = () => window.matchMedia(compactQuery).matches;
const getServerCompactHeader = () => false;

export default function Header() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const compact = useSyncExternalStore(
    subscribeToCompactHeader,
    getCompactHeader,
    getServerCompactHeader,
  );
  const current = navigation.find(
    ({ to }) => pathname === to || pathname.startsWith(`${to}/`),
  );

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => setMenuOpen(false), [compact]);

  return (
    <header className="site-header print:[&&]:hidden! px-[3.5%] py-0 gap-7 h-19 grid grid-cols-[minmax(90px,1fr)_auto_minmax(140px,1fr)] items-center bg-white border-b border-solid border-b-[#e4e9f1] [@media(width<=680px)]:px-4 [@media(width<=680px)]:gap-3 [@media(width<=680px)]:h-16 [@media(width<=680px)]:grid-cols-[auto_minmax(0,1fr)_auto] [@media(680px<width<=1100px)]:px-6 [@media(680px<width<=1100px)]:gap-5 [@media(680px<width<=1100px)]:grid-cols-[auto_minmax(0,1fr)_auto]">
      <Link
        to="/"
        className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 brand justify-self-start inline-flex items-baseline rounded-[8px] text-[38px] leading-none font-[850] tracking-[-2.5px] text-[#202b40] [@media(width<=680px)]:text-[34px] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4"
        aria-label="clik. — Accueil"
      >
        clik<span className="brand-period text-[#356ae6]">.</span>
      </Link>
      <nav
        className="min-w-0 justify-self-center"
        aria-label="Navigation principale"
      >
        <div className="header-nav-links gap-3.5 flex items-center [@media(width<=680px)]:gap-2.5 [@media(width<=680px)]:hidden [@media(680px<width<=1100px)]:gap-2.5">
          {navigation.map(({ to, label, short, tone }) => (
            <Link
              className="outline-offset-3 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4 px-5.5 py-0 relative isolate flex items-center justify-center h-10.5 rounded-[8px] text-[var(--nav-ink)] text-[13px] font-semibold whitespace-nowrap [transition:color_150ms] [@media(width<=1100px)]:px-4.25 before:inset-0 before:absolute before:-z-1 before:rounded-[8px] before:bg-[var(--nav-fill)] before:[clip-path:polygon(0_0,calc(100%-7px)_0,calc(100%-7px)_calc(50%-6px),100%_calc(50%-6px),100%_calc(50%+6px),calc(100%-7px)_calc(50%+6px),calc(100%-7px)_100%,0_100%,0_calc(50%+6px),7px_calc(50%+6px),7px_calc(50%-6px),0_calc(50%-6px))] before:transform-[rotate(var(--nav-tilt))] before:[transition:background_150ms] before:[content:''] hover:before:bg-[var(--nav-hover)] [--nav-fill:#edf3ff] [--nav-hover:#dfeaff] [--nav-ink:#3b609c] [--nav-active:#356ae6] [--nav-active-hover:#285bd3] [--nav-active-ink:#fff] [--nav-tilt:-1.5deg] data-[nav-tone=peach]:[--nav-fill:#fff0e5] data-[nav-tone=peach]:[--nav-hover:#ffe4d1] data-[nav-tone=peach]:[--nav-ink:#895b3b] data-[nav-tone=peach]:[--nav-active:#ffd1ad] data-[nav-tone=peach]:[--nav-active-hover:#ffc394] data-[nav-tone=peach]:[--nav-active-ink:#824321] data-[nav-tone=peach]:[--nav-tilt:1.5deg] data-[nav-tone=lilac]:[--nav-fill:#f1edfb] data-[nav-tone=lilac]:[--nav-hover:#e7def8] data-[nav-tone=lilac]:[--nav-ink:#725899] data-[nav-tone=lilac]:[--nav-active:#d7c5f5] data-[nav-tone=lilac]:[--nav-active-hover:#ccb5f0] data-[nav-tone=lilac]:[--nav-active-ink:#65429b] data-[nav-tone=lilac]:[--nav-tilt:-1deg] data-[nav-tone=mint]:[--nav-fill:#eaf5ef] data-[nav-tone=mint]:[--nav-hover:#d9ede2] data-[nav-tone=mint]:[--nav-ink:#437660] data-[nav-tone=mint]:[--nav-active:#bce6d2] data-[nav-tone=mint]:[--nav-active-hover:#a8dcc3] data-[nav-tone=mint]:[--nav-active-ink:#225e48] data-[nav-tone=mint]:[--nav-tilt:1.5deg]"
              key={to}
              to={to}
              aria-label={label}
              data-nav-tone={tone}
              activeProps={{
                className:
                  "active group/active aria-[current=page]:text-[var(--nav-active-ink)] aria-[current=page]:before:bg-[var(--nav-active)] aria-[current=page]:hover:before:bg-[var(--nav-active-hover)]",
              }}
            >
              <span className="header-nav-label [@media(width<=900px)]:hidden">
                {label}
              </span>
              <span
                className="header-nav-short hidden [@media(width<=900px)]:inline"
                aria-hidden="true"
              >
                {short}
              </span>
            </Link>
          ))}
        </div>
        {compact && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              className="header-nav-trigger before:inset-0 before:absolute before:-z-1 before:rounded-[8px] before:bg-[var(--nav-fill)] before:[clip-path:polygon(0_0,calc(100%-7px)_0,calc(100%-7px)_calc(50%-6px),100%_calc(50%-6px),100%_calc(50%+6px),calc(100%-7px)_calc(50%+6px),calc(100%-7px)_100%,0_100%,0_calc(50%+6px),7px_calc(50%+6px),7px_calc(50%-6px),0_calc(50%-6px))] before:transform-[rotate(var(--nav-tilt))] before:[transition:background_150ms] before:[content:''] hidden [@media(width<=680px)]:px-3.25 [@media(width<=680px)]:py-0 [@media(width<=680px)]:gap-1.75 [@media(width<=680px)]:inline-flex [@media(width<=680px)]:relative [@media(width<=680px)]:isolate [@media(width<=680px)]:items-center [@media(width<=680px)]:justify-center [@media(width<=680px)]:min-h-11 [@media(width<=680px)]:rounded-[8px] [@media(width<=680px)]:text-[var(--nav-ink)] [@media(width<=680px)]:text-xs [@media(width<=680px)]:font-medium [@media(width<=680px)]:cursor-pointer focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4 [@media(width<=680px)]:hover:before:bg-[var(--nav-hover)] [@media(width<=680px)]:[&[aria-expanded='true']::before]:bg-[var(--nav-hover)] [@media(width<=680px)]:data-[active=true]:text-[var(--nav-active-ink)] [@media(width<=680px)]:[&[data-active='true']::before]:bg-[var(--nav-active)] [@media(width<=680px)]:[&[data-active='true']:hover::before]:bg-[var(--nav-active-hover)] [@media(width<=680px)]:[&[data-active='true'][aria-expanded='true']::before]:bg-[var(--nav-active-hover)] [--nav-fill:#edf3ff] [--nav-hover:#dfeaff] [--nav-ink:#3b609c] [--nav-active:#356ae6] [--nav-active-hover:#285bd3] [--nav-active-ink:#fff] [--nav-tilt:-1.5deg] data-[nav-tone=peach]:[--nav-fill:#fff0e5] data-[nav-tone=peach]:[--nav-hover:#ffe4d1] data-[nav-tone=peach]:[--nav-ink:#895b3b] data-[nav-tone=peach]:[--nav-active:#ffd1ad] data-[nav-tone=peach]:[--nav-active-hover:#ffc394] data-[nav-tone=peach]:[--nav-active-ink:#824321] data-[nav-tone=peach]:[--nav-tilt:1.5deg] data-[nav-tone=lilac]:[--nav-fill:#f1edfb] data-[nav-tone=lilac]:[--nav-hover:#e7def8] data-[nav-tone=lilac]:[--nav-ink:#725899] data-[nav-tone=lilac]:[--nav-active:#d7c5f5] data-[nav-tone=lilac]:[--nav-active-hover:#ccb5f0] data-[nav-tone=lilac]:[--nav-active-ink:#65429b] data-[nav-tone=lilac]:[--nav-tilt:-1deg] data-[nav-tone=mint]:[--nav-fill:#eaf5ef] data-[nav-tone=mint]:[--nav-hover:#d9ede2] data-[nav-tone=mint]:[--nav-ink:#437660] data-[nav-tone=mint]:[--nav-active:#bce6d2] data-[nav-tone=mint]:[--nav-active-hover:#a8dcc3] data-[nav-tone=mint]:[--nav-active-ink:#225e48] data-[nav-tone=mint]:[--nav-tilt:1.5deg] [@media(width<=680px)]:leading-normal"
              aria-label="Explorer les rubriques"
              data-nav-tone={current?.tone || "blue"}
              data-active={!!current}
            >
              <span>{current?.short || "Explorer"}</span>
              <ChevronDown
                className="shrink-0 [@media(width<=680px)]:text-current [@media(width<=680px)]:opacity-70"
                size={14}
                aria-hidden="true"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="header-nav-menu p-0 border border-solid border-[#dfe7f3] w-70 max-w-[calc(100vw-24px)] rounded-[14px] bg-white text-[#344964] [box-shadow:0_16px_44px_#20396220]"
              align="center"
              sideOffset={16}
            >
              {navigation.map(({ to, label, tone }) => (
                <DropdownMenuItem
                  className="px-4.5 py-2.5 gap-3.25 min-h-12 rounded-none text-[13px] cursor-pointer focus:bg-[var(--nav-fill)] focus:text-[var(--nav-ink)] before:shrink-0 before:rounded-[4px] before:bg-[var(--nav-hover)] before:[clip-path:polygon(0_0,75%_0,75%_35%,100%_35%,100%_65%,75%_65%,75%_100%,0_100%,0_65%,25%_65%,25%_35%,0_35%)] before:transform-[rotate(var(--nav-tilt))] before:[content:''] aria-[current=page]:text-[var(--nav-ink)] aria-[current=page]:bg-[var(--nav-fill)] [&[aria-current='page']::before]:bg-[var(--nav-active)] [--nav-fill:#edf3ff] [--nav-hover:#dfeaff] [--nav-ink:#3b609c] [--nav-active:#356ae6] [--nav-active-hover:#285bd3] [--nav-active-ink:#fff] [--nav-tilt:-1.5deg] data-[nav-tone=peach]:[--nav-fill:#fff0e5] data-[nav-tone=peach]:[--nav-hover:#ffe4d1] data-[nav-tone=peach]:[--nav-ink:#895b3b] data-[nav-tone=peach]:[--nav-active:#ffd1ad] data-[nav-tone=peach]:[--nav-active-hover:#ffc394] data-[nav-tone=peach]:[--nav-active-ink:#824321] data-[nav-tone=peach]:[--nav-tilt:1.5deg] data-[nav-tone=lilac]:[--nav-fill:#f1edfb] data-[nav-tone=lilac]:[--nav-hover:#e7def8] data-[nav-tone=lilac]:[--nav-ink:#725899] data-[nav-tone=lilac]:[--nav-active:#d7c5f5] data-[nav-tone=lilac]:[--nav-active-hover:#ccb5f0] data-[nav-tone=lilac]:[--nav-active-ink:#65429b] data-[nav-tone=lilac]:[--nav-tilt:-1deg] data-[nav-tone=mint]:[--nav-fill:#eaf5ef] data-[nav-tone=mint]:[--nav-hover:#d9ede2] data-[nav-tone=mint]:[--nav-ink:#437660] data-[nav-tone=mint]:[--nav-active:#bce6d2] data-[nav-tone=mint]:[--nav-active-hover:#a8dcc3] data-[nav-tone=mint]:[--nav-active-ink:#225e48] data-[nav-tone=mint]:[--nav-tilt:1.5deg] before:size-5 leading-(--text-xs--line-height)"
                  key={to}
                  render={
                    <Link
                      className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4 aria-[current=page]:text-[var(--nav-ink)] aria-[current=page]:bg-[var(--nav-fill)] [&[aria-current='page']::before]:bg-[var(--nav-active)]"
                      to={to}
                    />
                  }
                  nativeButton={false}
                  data-nav-tone={tone}
                  aria-current={current?.to === to ? "page" : undefined}
                >
                  {label}
                  {current?.to === to && (
                    <span
                      className="header-nav-dot ml-auto rounded-full bg-current size-1.25 aria-[current=page]:text-[var(--nav-ink)] aria-[current=page]:bg-[var(--nav-fill)] [&[aria-current='page']::before]:bg-[var(--nav-active)]"
                      aria-hidden="true"
                    />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
      <div className="header-account justify-self-end min-w-0 max-w-full">
        <Authenticated>
          <UserMenu />
        </Authenticated>
        <Unauthenticated>
          <Link
            to="/sign-in"
            className="outline-offset-3 header-sign-in px-4.75 py-0 gap-2.25 border border-solid border-transparent inline-flex items-center justify-center h-10 max-w-full rounded-3xl text-xs font-medium whitespace-nowrap [box-shadow:none] [transition:background_150ms,color_150ms] bg-[#edf3ff] text-[#285bc5] [@media(width<=680px)]:px-3.25 [@media(width<=680px)]:min-h-10 hover:bg-[#e4edff] hover:text-[#2458be] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4 leading-normal"
            aria-label="Se connecter"
            onClick={() =>
              sessionStorage.setItem(
                "clik-return-to",
                window.location.pathname + window.location.search,
              )
            }
          >
            Connexion
          </Link>
        </Unauthenticated>
      </div>
    </header>
  );
}
