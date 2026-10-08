import { cn } from "@/lib/utils";
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
    <header
      className={cn(
        "site-header print:[&&]:hidden! px-[3.5%] py-[0] gap-[28px] h-[76px] grid grid-cols-[minmax(90px,_1fr)_auto_minmax(140px,_1fr)] items-center bg-[#fff] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4e9f1] [@media(width<=680px)]:px-[16px] [@media(width<=680px)]:gap-[12px] [@media(width<=680px)]:h-[64px] [@media(width<=680px)]:grid-cols-[auto_minmax(0,_1fr)_auto] [@media(680px<width<=1100px)]:px-[24px] [@media(680px<width<=1100px)]:gap-[20px] [@media(680px<width<=1100px)]:grid-cols-[auto_minmax(0,_1fr)_auto] [&_nav]:min-w-[0] [&_nav]:[justify-self:center] [&_a:focus-visible]:[outline:2px_solid_#356ae6] [&_a:focus-visible]:[outline-offset:4px]",
      )}
    >
      <Link
        to="/"
        className={cn(
          "brand [justify-self:start] inline-flex items-baseline rounded-[8px] [font-size:38px] leading-[1] font-[850] tracking-[-2.5px] text-[color:#202b40] [@media(width<=680px)]:[font-size:34px] [&:hover]:text-[color:#356ae6]",
        )}
        aria-label="clik. — Accueil"
      >
        clik<span className={cn("brand-period text-[color:#356ae6]")}>.</span>
      </Link>
      <nav aria-label="Navigation principale">
        <div
          className={cn(
            "header-nav-links gap-[14px] flex items-center [@media(width<=680px)]:gap-[10px] [@media(width<=680px)]:hidden [@media(680px<width<=1100px)]:gap-[10px] [&_a]:px-[22px] [&_a]:py-[0] [&_a]:relative [&_a]:isolate [&_a]:flex [&_a]:items-center [&_a]:justify-center [&_a]:h-[42px] [&_a]:rounded-[8px] [&_a]:text-[color:var(--nav-ink)] [&_a]:[font-size:13px] [&_a]:font-[600] [&_a]:whitespace-nowrap [&_a]:[transition:color_150ms] [@media(width<=1100px)]:[&_a]:px-[17px] [&_a::before]:inset-[0] [&_a::before]:absolute [&_a::before]:z-[-1] [&_a::before]:rounded-[8px] [&_a::before]:bg-[var(--nav-fill)] [&_a::before]:[clip-path:polygon(_0_0,_calc(100%_-_7px)_0,_calc(100%_-_7px)_calc(50%_-_6px),_100%_calc(50%_-_6px),_100%_calc(50%_+_6px),_calc(100%_-_7px)_calc(50%_+_6px),_calc(100%_-_7px)_100%,_0_100%,_0_calc(50%_+_6px),_7px_calc(50%_+_6px),_7px_calc(50%_-_6px),_0_calc(50%_-_6px)_)] [&_a::before]:[transform:rotate(var(--nav-tilt))] [&_a::before]:[transition:background_150ms] [&_a::before]:[content:''] [&_a:hover::before]:bg-[var(--nav-hover)] [&_a[class~='group/active']]:text-[color:var(--nav-active-ink)] [&_a[class~='group/active']::before]:bg-[var(--nav-active)] [&_a[class~='group/active']:hover::before]:bg-[var(--nav-active-hover)]",
          )}
        >
          {navigation.map(({ to, label, short, tone }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              data-nav-tone={tone}
              activeProps={{ className: "active group/active" }}
            >
              <span
                className={cn("header-nav-label [@media(width<=900px)]:hidden")}
              >
                {label}
              </span>
              <span
                className={cn(
                  "header-nav-short hidden [@media(width<=900px)]:inline",
                )}
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
              className={cn(
                "header-nav-trigger [&::before]:inset-[0] [&::before]:absolute [&::before]:z-[-1] [&::before]:rounded-[8px] [&::before]:bg-[var(--nav-fill)] [&::before]:[clip-path:polygon(_0_0,_calc(100%_-_7px)_0,_calc(100%_-_7px)_calc(50%_-_6px),_100%_calc(50%_-_6px),_100%_calc(50%_+_6px),_calc(100%_-_7px)_calc(50%_+_6px),_calc(100%_-_7px)_100%,_0_100%,_0_calc(50%_+_6px),_7px_calc(50%_+_6px),_7px_calc(50%_-_6px),_0_calc(50%_-_6px)_)] [&::before]:[transform:rotate(var(--nav-tilt))] [&::before]:[transition:background_150ms] [&::before]:[content:''] hidden [@media(width<=680px)]:px-[13px] [@media(width<=680px)]:py-[0] [@media(width<=680px)]:gap-[7px] [@media(width<=680px)]:inline-flex [@media(width<=680px)]:relative [@media(width<=680px)]:isolate [@media(width<=680px)]:items-center [@media(width<=680px)]:justify-center [@media(width<=680px)]:min-h-[44px] [@media(width<=680px)]:rounded-[8px] [@media(width<=680px)]:text-[color:var(--nav-ink)] [@media(width<=680px)]:[font-size:12px] [@media(width<=680px)]:font-[500] [@media(width<=680px)]:cursor-[pointer] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:4px] [@media(width<=680px)]:[&:hover::before]:bg-[var(--nav-hover)] [@media(width<=680px)]:[&[aria-expanded='true']::before]:bg-[var(--nav-hover)] [@media(width<=680px)]:[&[data-active='true']]:text-[color:var(--nav-active-ink)] [@media(width<=680px)]:[&[data-active='true']::before]:bg-[var(--nav-active)] [@media(width<=680px)]:[&[data-active='true']:hover::before]:bg-[var(--nav-active-hover)] [@media(width<=680px)]:[&[data-active='true'][aria-expanded='true']::before]:bg-[var(--nav-active-hover)] [@media(width<=680px)]:[&_svg]:text-[color:currentColor] [@media(width<=680px)]:[&_svg]:opacity-[0.7]",
              )}
              aria-label="Explorer les rubriques"
              data-nav-tone={current?.tone || "blue"}
              data-active={!!current}
            >
              <span>{current?.short || "Explorer"}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn(
                "header-nav-menu p-[0] border-[length:1px] border-solid border-[color:#dfe7f3] w-[280px] max-w-[calc(100vw_-_24px)] rounded-[14px] bg-[#fff] text-[color:#344964] [box-shadow:0_16px_44px_#20396220] [&_[data-slot='dropdown-menu-item']]:px-[18px] [&_[data-slot='dropdown-menu-item']]:py-[10px] [&_[data-slot='dropdown-menu-item']]:gap-[13px] [&_[data-slot='dropdown-menu-item']]:min-h-[48px] [&_[data-slot='dropdown-menu-item']]:rounded-[0] [&_[data-slot='dropdown-menu-item']]:[font-size:13px] [&_[data-slot='dropdown-menu-item']]:cursor-[pointer] [&_[data-slot='dropdown-menu-item']:focus]:bg-[var(--nav-fill)] [&_[data-slot='dropdown-menu-item']:focus]:text-[color:var(--nav-ink)] [&_[data-slot='dropdown-menu-item']::before]:w-[20px] [&_[data-slot='dropdown-menu-item']::before]:h-[20px] [&_[data-slot='dropdown-menu-item']::before]:shrink-[0] [&_[data-slot='dropdown-menu-item']::before]:rounded-[4px] [&_[data-slot='dropdown-menu-item']::before]:bg-[var(--nav-hover)] [&_[data-slot='dropdown-menu-item']::before]:[clip-path:polygon(_0_0,_75%_0,_75%_35%,_100%_35%,_100%_65%,_75%_65%,_75%_100%,_0_100%,_0_65%,_25%_65%,_25%_35%,_0_35%_)] [&_[data-slot='dropdown-menu-item']::before]:[transform:rotate(var(--nav-tilt))] [&_[data-slot='dropdown-menu-item']::before]:[content:''] [&_[aria-current='page']]:text-[color:var(--nav-ink)] [&_[aria-current='page']]:bg-[var(--nav-fill)] [&_[aria-current='page']::before]:bg-[var(--nav-active)]",
              )}
              align="center"
              sideOffset={16}
            >
              {navigation.map(({ to, label, tone }) => (
                <DropdownMenuItem
                  key={to}
                  render={<Link to={to} />}
                  nativeButton={false}
                  data-nav-tone={tone}
                  aria-current={current?.to === to ? "page" : undefined}
                >
                  {label}
                  {current?.to === to && (
                    <span
                      className={cn(
                        "header-nav-dot w-[5px] h-[5px] ml-[auto] rounded-[50%] bg-[currentColor]",
                      )}
                      aria-hidden="true"
                    />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
      <div
        className={cn(
          "header-account [justify-self:end] min-w-[0] max-w-[100%]",
        )}
      >
        <Authenticated>
          <UserMenu />
        </Authenticated>
        <Unauthenticated>
          <Link
            to="/sign-in"
            className={cn(
              "header-sign-in px-[19px] py-[0] gap-[9px] border-[length:1px] border-solid border-[color:transparent] inline-flex items-center justify-center h-[40px] max-w-[100%] rounded-[24px] [font-size:12px] font-[500] whitespace-nowrap [box-shadow:none] [transition:background_150ms,_color_150ms] bg-[#edf3ff] text-[color:#285bc5] [@media(width<=680px)]:px-[13px] [@media(width<=680px)]:min-h-[40px] [&:hover]:bg-[#e4edff] [&:hover]:text-[color:#2458be]",
            )}
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
