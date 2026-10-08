import { cn } from "@/lib/utils";
import { loadPublic, type PublicData } from "@/lib/seo/public-data";
import { seo, collection } from "@/lib/seo/meta";
import { formatChallengeDay } from "@/lib/clik/challenge-date";
import {
  usePublicPagination,
  continuationHref,
} from "@/lib/clik/use-public-pagination";
import PublicMore from "@/components/clik/public-more";
import ChallengeRewards from "@/components/challenges/rewards";
import { useHydrated } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFileRoute,
  Link,
  useNavigate,
  notFound,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type {
  Doc,
  Id,
} from "@my-better-t-app/backend/convex/_generated/dataModel";
import {
  CATALOG,
  challengeDay,
  challengeStart,
  CHALLENGE_DAY_MS,
  type PartType,
} from "@clik/scene";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  MessageCircle,
} from "lucide-react";
import AuthorLink from "@/components/clik/author-link";
import PartPreview from "@/components/clik/part-preview";
import { ChallengeDatePicker } from "@/components/challenges/date-picker";
import {
  SignInTo,
  useServerNow,
  VoteButton,
} from "@/components/challenges/shared";
export const Route = createFileRoute("/challenges")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { date?: string; cursor?: string; sort?: "recent" | "votes" } => {
    let date: string | undefined;
    if (typeof search.date === "string") {
      try {
        challengeStart(search.date);
        date = search.date;
      } catch {
        /* Invalid dates use today's page. */
      }
    }
    return {
      date,
      cursor:
        (typeof search.cursor === "string" ||
          typeof search.cursor === "number") &&
        String(search.cursor).length <= 8192
          ? String(search.cursor)
          : undefined,
      sort:
        search.sort === "votes" || search.sort === "recent"
          ? search.sort
          : undefined,
    };
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const result = await loadPublic({
      kind: "challenge",
      day: deps.date,
      cursor: deps.cursor,
      sort: deps.sort,
    });
    if (deps.date && deps.date !== result.data.today && !result.data.challenge)
      throw notFound();
    return result;
  },
  head: ({ loaderData, match }) => {
    const date = match.search.date;
    const formattedDate = date ? formatChallengeDay(date) : "";
    const archive = date && date !== loaderData?.data.today;
    const path = archive ? `/challenges?date=${date}` : "/challenges";
    const title = archive
      ? `Défi de construction du ${formattedDate}`
      : "Le défi du jour : construisez en briques 3D";
    return seo({
      title,
      text: archive
        ? `Découvrez les créations du défi Clik du ${formattedDate}. Explorez les constructions, votez pour vos préférées et partagez vos idées.`
        : "100 pièces, 24 heures, votre imagination. Participez au défi de construction en briques 3D du jour et découvrez les créations de la communauté Clik.",
      path,
      noindex: !!match.search.cursor || !loaderData,
      schema: collection(title, path),
    });
  },
  component: Challenges,
});
function Challenges() {
  const { date } = Route.useSearch(),
    navigate = useNavigate();
  const initial = Route.useLoaderData();
  const [today, setToday] = useState(initial.data.today);
  const liveData = useQuery(api.challenges.day, { day: date ?? today });
  const data = liveData === undefined ? initial.data : liveData;
  const now = useServerNow(data?.serverNow);
  const ensure = useMutation(api.challenges.ensureToday),
    start = useMutation(api.challenges.start);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { isAuthenticated } = useConvexAuth();
  useEffect(() => setToday(challengeDay(now)), [now]);
  useEffect(() => {
    let active = true;
    void ensure({}).catch((e) => {
      if (active) setError(String(e));
    });
    return () => {
      active = false;
    };
  }, [today, ensure]);
  const selected = date ?? today,
    challenge = data?.challenge;
  const open =
    !!challenge && now >= challenge.opensAt && now < challenge.closesAt;
  const choose = (date: string) =>
    void navigate({ to: "/challenges", search: { date } });
  const remaining = challenge ? Math.max(0, challenge.closesAt - now) : 0;
  return (
    <main
      className={cn(
        "collection-page challenges-page px-[5%] py-[64px] m-[auto] max-w-[1320px] [@media(width<=850px)]:pt-[40px] max-w-[1320px]",
      )}
    >
      <div
        className={cn(
          "page-heading group/page-heading gap-[25px] flex justify-between items-center mb-[45px] [@media(width<=850px)]:items-start [@media(width<=850px)]:flex-col [&_h1]:mx-[0] [&_h1]:my-[12px] [&_h1]:[font-size:48px] [&_h1]:tracking-[-2px] [&_h1]:font-[800] [@media(width<=850px)]:[&_h1]:[font-size:40px] [&_h1_>_span]:text-[color:#356ae6] [&_p]:text-[color:#7b889b] [&_p]:[font-size:15px]",
        )}
      >
        <div>
          <h1>
            {date && date !== today
              ? `Le défi du ${formatChallengeDay(date)}`
              : "Le défi du jour"}
            <span>.</span>
          </h1>
          <p>
            100 pièces à votre disposition. 24 heures pour en faire votre idée.
          </p>
        </div>
      </div>
      <div
        className={cn(
          "challenge-toolbar mx-[0] my-[28px] flex items-center flex-wrap gap-y-[12px] gap-x-[24px]",
        )}
      >
        <div
          className={cn(
            "challenge-navigation gap-[8px] flex items-center flex-wrap flex-[1_1_auto] min-w-[0] [@media(width<=480px)]:grid [@media(width<=480px)]:grid-cols-[42px_minmax(0,_1fr)_42px] [@media(width<=480px)]:basis-[100%] [@media(480px<width<=640px)]:basis-[100%] [&_button]:px-[13px] [&_button]:py-[8px] [&_button]:gap-[10px] [&_button]:border-[length:1px] [&_button]:border-solid [&_button]:border-[color:#dee5f0] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:min-h-[42px] [&_button]:rounded-[9px] [&_button]:bg-[#fff] [&_button]:text-[color:#435976] [&_button]:[font-size:13px] [&_button:hover:not(:disabled)]:bg-[#edf3ff] [&_>_span]:ml-[auto] [&_>_span]:[font-size:11px] [&_>_span]:text-[color:#7d8da5] [@media(width<=640px)]:[&_>_span]:ml-[0] [@media(width<=640px)]:[&_>_span]:w-[100%] [&_[class~='group/challenge-date-trigger']]:py-[6px] [&_[class~='group/challenge-date-trigger']]:gap-[10px] [&_[class~='group/challenge-date-trigger']]:border-[color:#d9e3f3] [&_[class~='group/challenge-date-trigger']]:min-h-[44px] [&_[class~='group/challenge-date-trigger']]:pr-[12px] [&_[class~='group/challenge-date-trigger']]:pl-[7px] [&_[class~='group/challenge-date-trigger']]:rounded-[11px] [&_[class~='group/challenge-date-trigger']]:text-[color:#344964] [&_[class~='group/challenge-date-trigger']]:font-[650] [@media(width<=480px)]:[&_[class~='group/challenge-date-trigger']]:px-[6px] [@media(width<=480px)]:[&_[class~='group/challenge-date-trigger']]:gap-[6px] [@media(width<=480px)]:[&_[class~='group/challenge-date-trigger']]:[font-size:12px] [&_[class~='group/challenge-date-trigger']:hover]:border-[color:#adc5f0] [&_[class~='group/challenge-date-trigger']:hover]:bg-[#f5f8ff] [&_[class~='group/challenge-date-trigger']:hover]:text-[color:#285abd] [&_[class~='group/challenge-date-trigger'][data-popup-open]]:border-[color:#adc5f0] [&_[class~='group/challenge-date-trigger'][data-popup-open]]:bg-[#f5f8ff] [&_[class~='group/challenge-date-trigger'][data-popup-open]]:text-[color:#285abd] [@media(width<=480px)]:[&_>_button[aria-label]]:px-[8px] [@media(width<=480px)]:[&_>_button:last-child]:col-[1_/_-1] [@media(width<=480px)]:[&_>_button:last-child]:[justify-self:end]",
          )}
        >
          <button
            aria-label="Défi précédent"
            disabled={!data || selected <= data.firstDay}
            onClick={() =>
              choose(challengeDay(challengeStart(selected) - CHALLENGE_DAY_MS))
            }
          >
            <ArrowLeft size={18} />
          </button>
          <ChallengeDatePicker
            key={selected}
            day={selected}
            first={data?.firstDay ?? today}
            last={today}
            onChange={choose}
          />
          <button
            aria-label="Défi suivant"
            disabled={selected >= today}
            onClick={() =>
              choose(challengeDay(challengeStart(selected) + CHALLENGE_DAY_MS))
            }
          >
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => void navigate({ to: "/challenges", search: {} })}
            disabled={!date}
          >
            Aujourd’hui
          </button>
        </div>
        {challenge && (
          <ChallengeRewards
            key={challenge._id}
            challenge={challenge}
            now={now}
          />
        )}
      </div>
      {error && (
        <p
          className={cn(
            "challenge-error px-[15px] py-[12px] gap-[10px] border-[length:1px] border-solid border-[color:#efd5db] flex flex-wrap rounded-[9px] bg-[#fff4f6] text-[color:#9d3d50] [font-size:13px] leading-[1.8] [overflow-wrap:anywhere] [&_button]:[text-decoration:underline]",
          )}
          role="alert"
        >
          {error}
          <button
            onClick={() => {
              setError("");
              void ensure({}).catch((e) => setError(String(e)));
            }}
          >
            Réessayer
          </button>
        </p>
      )}
      {!data ? (
        <div
          className={cn(
            "empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
          )}
        >
          Ouverture du défi…
        </div>
      ) : !challenge ? (
        <div
          className={cn(
            "empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
          )}
        >
          <h2>
            {selected === today
              ? "Le défi se prépare…"
              : "Aucun défi à cette date."}
          </h2>
          <p>Choisissez une autre journée ou revenez au défi d’aujourd’hui.</p>
        </div>
      ) : (
        <>
          <section
            className={cn(
              "challenge-kit overflow-hidden border-[length:1px] border-solid border-[color:#dfe7f3] bg-[#fff] rounded-[20px]",
            )}
            aria-label="Le lot du défi"
          >
            <div
              className={cn(
                "challenge-kit-heading px-[28px] py-[25px] gap-[20px] flex items-center justify-between flex-wrap [@media(width<=640px)]:p-[20px] [&_h2]:mx-[0] [&_h2]:my-[7px] [&_h2]:[font-size:25px] [&_h2]:font-[800] [&_h2]:tracking-[-0.7px] [&_p]:[font-size:13px] [&_p]:leading-[1.8] [&_p]:text-[color:#6e809d]",
              )}
            >
              <div>
                <h2>Les pièces du jour</h2>
                <p>Utilisez tout ou partie du lot. Les couleurs sont libres.</p>
              </div>
              <span
                className={cn(
                  cn(
                    "challenge-time px-[13px] py-[10px] gap-[8px] inline-flex items-center text-[color:#7e6e59] bg-[#f7f3ec] [font-size:12px] rounded-[9px] [&[class~='group/is-open']]:bg-[#ecf8f1] [&[class~='group/is-open']]:text-[color:#337c59]",
                    open ? "is-open group/is-open" : "",
                  ),
                )}
              >
                <Clock3 size={16} />
                {open
                  ? `${Math.floor(remaining / 3600000)} h ${Math.floor(remaining / 60000) % 60} min restantes`
                  : "Participations closes"}
              </span>
            </div>
            <div
              className={cn(
                "challenge-stock-grid px-[28px] gap-[10px] grid grid-cols-[repeat(6,_minmax(0,_1fr))] pt-[0] pb-[25px] [@media(width<=640px)]:px-[14px] [@media(width<=640px)]:gap-[7px] [@media(width<=640px)]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=640px)]:pb-[18px] [@media(640px<width<=850px)]:grid-cols-[repeat(4,_minmax(0,_1fr))]",
              )}
            >
              {challenge.stock.map((item) => (
                <div
                  className={cn(
                    "challenge-stock-card px-[9px] border-[length:1px] border-solid border-[color:#e7ecf6] relative pt-[20px] pb-[12px] bg-[#f6f8fd] rounded-[12px] text-center [@media(width<=640px)]:px-[5px] [&_>_span]:absolute [&_>_span]:top-[8px] [&_>_span]:right-[10px] [&_>_span]:[font-size:12px] [&_>_span]:font-[700] [&_>_span]:text-[color:#356ae6] [&_[class~='group/part-preview']]:mx-[auto] [&_[class~='group/part-preview']]:my-[5px] [&_[class~='group/part-preview']]:h-[70px] [@media(width<=640px)]:[&_[class~='group/part-preview']]:h-[55px] [&_p]:text-[color:#5e7293] [&_p]:[font-size:11px]",
                  )}
                  key={item.type}
                >
                  <span>× {item.quantity}</span>
                  <PartPreview type={item.type as PartType} color="#4079e8" />
                  <p>{CATALOG[item.type as PartType].name}</p>
                </div>
              ))}
            </div>
            <div
              className={cn(
                "challenge-kit-footer px-[28px] py-[25px] gap-[20px] flex items-center justify-between flex-wrap [border-top-width:1px] [border-top-style:solid] [border-top-color:#e8edf5] bg-[#fafbff] [@media(width<=640px)]:p-[20px] [&_p]:[font-size:13px] [&_p]:leading-[1.8] [&_p]:text-[color:#6e809d] [&_>_a]:text-[color:#356ae6] [&_>_a]:[font-size:13px] [&_>_a]:font-[600] [@media(width<=640px)]:[&_[class~='group/primary-link']]:w-[100%]",
              )}
            >
              <p>
                {open
                  ? "Une création par personne, modifiable jusqu’à minuit UTC."
                  : "Les constructions sont figées. Les votes et les échanges continuent."}
              </p>
              {open ? (
                isAuthenticated ? (
                  <button
                    className={cn(
                      "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
                    )}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        const id = await start({ day: selected });
                        await navigate({
                          to: "/editor/$projectId",
                          params: { projectId: id },
                        });
                      } catch (e) {
                        setError(String(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy
                      ? "Ouverture…"
                      : data.projectId
                        ? "Reprendre ma création"
                        : "Participer au défi"}
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <SignInTo>
                    Se connecter pour participer <ArrowRight size={16} />
                  </SignInTo>
                )
              ) : (
                data.projectId && (
                  <Link
                    to="/editor/$projectId"
                    params={{ projectId: data.projectId }}
                  >
                    Retrouver mon travail privé
                  </Link>
                )
              )}
            </div>
            <p
              className={cn(
                "challenge-device-note px-[22px] hidden pt-[0] pb-[20px] text-[color:#70839f] [font-size:12px] leading-[1.8] bg-[#fafbff] [@media(width<=850px)]:block",
              )}
            >
              Pour construire, ouvrez l’atelier sur ordinateur. Vous pouvez
              voter et commenter sur mobile.
            </p>
          </section>
          <Entries
            key={challenge._id}
            challenge={challenge}
            open={open}
            choices={data.choices}
            initial={initial}
          />
        </>
      )}
    </main>
  );
}
function Entries({
  challenge,
  open,
  choices,
  initial,
}: {
  challenge: Doc<"challenges">;
  open: boolean;
  choices: { publicationId: Id<"publications"> }[];
  initial: PublicData["challenge"];
}) {
  const search = Route.useSearch();
  const hydrated = useHydrated();
  const navigate = Route.useNavigate();
  const sort = search.sort ?? (open ? "recent" : "votes");
  const { results, status, loadMore, nextCursor } = usePublicPagination(
    api.challenges.entries,
    { challengeId: challenge._id, sort },
    initial.sort === sort ? initial.entries : undefined,
    search.cursor,
  );
  return (
    <section
      className={cn("challenge-entries mt-[48px]")}
      aria-labelledby="entries-title"
    >
      <div
        className={cn(
          "challenge-entries-heading gap-[20px] flex items-center justify-between flex-wrap mb-[25px] [&_h2]:[font-size:25px] [&_h2]:tracking-[-0.7px] [&_h2]:font-[800] [@media(width<=640px)]:[&_h2]:[font-size:23px] [&_p]:mt-[8px] [&_p]:text-[color:#71839c] [&_p]:[font-size:12px] [&_p]:leading-[1.7]",
        )}
      >
        <div>
          <h2 id="entries-title">À vous de choisir vos coups de cœur.</h2>
          <p>
            {choices.length} / 3 votes attribués pour ce défi. Retirez un vote
            pour changer de choix.
          </p>
        </div>
        <div
          className={cn(
            "challenge-sort gap-[10px] flex items-center shrink-[0] [font-size:12px] text-[color:#71839c]",
          )}
        >
          <label htmlFor="challenge-sort">Trier</label>
          <Select
            disabled={!hydrated}
            items={[
              { value: "recent", label: "Récentes" },
              { value: "votes", label: "Les plus aimées" },
            ]}
            value={sort}
            onValueChange={(value) => {
              if (value === "recent" || value === "votes")
                void navigate({
                  search: { date: search.date, sort: value },
                  resetScroll: false,
                });
            }}
          >
            <SelectTrigger
              id="challenge-sort"
              className={cn(
                "challenge-sort-trigger px-[11px] py-[8px] border-[length:1px] border-solid border-[color:#dfe7f2] w-[160px] min-h-[38px] rounded-[9px] bg-[#fff] text-[color:#455f83] cursor-[pointer] [&:hover]:border-[color:#b7caf0] [&:hover]:bg-[#f8faff] [&[data-popup-open]]:border-[color:#b7caf0] [&[data-popup-open]]:bg-[#f8faff] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px]",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className={cn(
                "challenge-sort-menu p-[4px] rounded-[11px] bg-[#fff] text-[color:#455f83] [box-shadow:0_8px_24px_#213d6a14,_0_0_0_1px_#dfe7f2] [&_[data-slot='select-item']]:min-h-[36px] [&_[data-slot='select-item']]:rounded-[7px] [&_[data-slot='select-item']]:cursor-[pointer] [&_[data-slot='select-item'][data-highlighted]]:bg-[#edf3ff] [&_[data-slot='select-item'][data-highlighted]]:text-[color:#2458ce] [&_[data-slot='select-item'][data-selected]]:text-[color:#2458ce]",
              )}
              align="end"
              alignItemWithTrigger={false}
            >
              <SelectItem value="recent">Récentes</SelectItem>
              <SelectItem value="votes">Les plus aimées</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {!results.length ? (
        <div
          className={cn(
            "empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
          )}
        >
          {status === "LoadingFirstPage"
            ? "Chargement des créations…"
            : open
              ? "La première idée pourrait être la vôtre."
              : "Aucune création n’a été proposée pour ce défi."}
        </div>
      ) : (
        <div
          className={cn(
            "creation-grid group/creation-grid gap-[26px] grid grid-cols-[repeat(3,_1fr)] [@media(width<=520px)]:gap-[15px] [@media(width<=520px)]:grid-cols-[1fr] [@media(520px<width<=850px)]:gap-[15px] [@media(520px<width<=850px)]:grid-cols-[repeat(2,_1fr)]",
          )}
        >
          {results.map((p) => (
            <article
              className={cn(
                "creation-card challenge-entry group/creation-card overflow-hidden border-[length:1px] border-solid border-[color:#e4eaf2] rounded-[14px] bg-[white] [a&:hover_[class~='group/card-arrow']]:bg-[#356ae6] [a&:hover_[class~='group/card-arrow']]:text-[color:white] [&_>_a:hover_[class~='group/card-arrow']]:bg-[#356ae6] [&_>_a:hover_[class~='group/card-arrow']]:text-[color:white] overflow-hidden [&_[class~='group/thumbnail']_img]:w-[100%] [&_[class~='group/thumbnail']_img]:h-[100%] [&_[class~='group/thumbnail']_img]:object-contain [&_h3]:[font-size:16px] [&_h3]:font-[700] [&_[class~='group/public-card-author']]:px-[20px] [&_[class~='group/public-card-author']]:pt-[0] [&_[class~='group/public-card-author']]:pb-[16px]",
              )}
              key={p._id}
            >
              <Link
                to="/creations/$publicationId"
                params={{ publicationId: p._id }}
              >
                <div
                  className={cn(
                    "thumbnail group/thumbnail [aspect-ratio:4/3] bg-[#eef2f8] relative [&_img]:w-[100%] [&_img]:h-[100%] [&_img]:object-cover",
                  )}
                >
                  {p.thumbnailUrl && (
                    <img src={p.thumbnailUrl} alt={p.title} loading="lazy" />
                  )}
                  <span
                    className={cn(
                      "card-arrow group/card-arrow absolute bottom-[15px] right-[15px] bg-[#ffffffde] rounded-[50%] h-[32px] w-[32px] grid [place-items:center] text-[color:#356ae6] [transition:background_150ms]",
                    )}
                    aria-hidden="true"
                  >
                    <ArrowUpRight size={19} />
                  </span>
                </div>
                <div
                  className={cn(
                    "card-meta group/card-meta px-[20px] py-[18px] [&_h2]:[font-size:16px] [&_h2]:font-[700] [&_p]:[font-size:12px] [&_p]:text-[color:#8a97aa] [&_p]:mt-[6px]",
                  )}
                >
                  <h3>{p.title}</h3>
                </div>
              </Link>
              <p
                className={cn(
                  "public-card-author group/public-card-author min-w-[0] text-[color:#73829a] [font-size:12px]",
                )}
              >
                par{" "}
                <AuthorLink id={p.owner} name={p.author} avatar={p.avatar} />
              </p>
              <div
                className={cn(
                  "challenge-entry-actions px-[16px] py-[12px] gap-[8px] flex justify-between items-center flex-wrap [border-top-width:1px] [border-top-style:solid] [border-top-color:#edf0f6] bg-[#fcfcfe]",
                )}
              >
                <VoteButton
                  publicationId={p._id}
                  owner={p.owner}
                  count={p.voteCount}
                  choices={choices}
                />
                <Link
                  to="/creations/$publicationId"
                  params={{ publicationId: p._id }}
                  hash="comments"
                  className={cn(
                    "challenge-entry-comments px-[9px] py-[6px] gap-[6px] inline-flex items-center justify-center min-h-[38px] min-w-[38px] ml-[auto] rounded-[10px] text-[color:#8792a5] [font-size:12px] tabular-nums [&:hover]:bg-[#eef1f8] [&:hover]:text-[color:#536c90] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px]",
                  )}
                  aria-label={`${p.commentCount} commentaires sur ${p.title}`}
                >
                  <MessageCircle size={16} aria-hidden="true" />
                  {p.commentCount}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {status === "CanLoadMore" && (
        <PublicMore
          className={cn("load-more group/load-more mx-[auto] my-[35px] block")}
          href={continuationHref("/challenges", nextCursor, {
            date: challenge.day,
            sort,
          })}
          loading={false}
          onMore={() => loadMore(12)}
        >
          Voir plus de créations
        </PublicMore>
      )}
      {status === "LoadingMore" && <p role="status">Chargement…</p>}
    </section>
  );
}
