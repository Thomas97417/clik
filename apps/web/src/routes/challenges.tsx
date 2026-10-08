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
    <main className="collection-page challenges-page px-[5%] py-16 m-auto max-w-330 max-lg-narrow:pt-10">
      <div className="page-heading group/page-heading gap-6.25 flex justify-between items-center mb-11.25 max-lg-narrow:items-start max-lg-narrow:flex-col">
        <div>
          <h1 className="mx-0 my-3 text-5xl leading-[inherit] tracking-[-2px] font-extrabold max-lg-narrow:text-[40px]">
            {date && date !== today
              ? `Le défi du ${formatChallengeDay(date)}`
              : "Le défi du jour"}
            <span className="text-[#356ae6]">.</span>
          </h1>
          <p className="text-[#7b889b] text-[15px]">
            100 pièces à votre disposition. 24 heures pour en faire votre idée.
          </p>
        </div>
      </div>
      <div className="challenge-toolbar mx-0 my-7 flex items-center flex-wrap gap-y-3 gap-x-6">
        <div className="challenge-navigation gap-2 flex items-center flex-wrap flex-[1_1_auto] min-w-0 max-xs-wide:grid max-xs-wide:grid-cols-[42px_minmax(0,1fr)_42px] max-xs-wide:basis-full min-xs-wide:max-sm:basis-full">
          <button
            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 px-3.25 py-2 gap-2.5 border border-solid border-[#dee5f0] inline-flex items-center justify-center min-h-10.5 rounded-[9px] bg-white text-[#435976] text-[13px] hover:enabled:bg-[#edf3ff] max-xs-wide:[&[aria-label]]:px-2 max-xs-wide:last:col-span-full max-xs-wide:last:justify-self-end"
            aria-label="Défi précédent"
            disabled={!data || selected <= data.firstDay}
            onClick={() =>
              choose(challengeDay(challengeStart(selected) - CHALLENGE_DAY_MS))
            }
          >
            <ArrowLeft className="shrink-0" size={18} />
          </button>
          <ChallengeDatePicker
            key={selected}
            day={selected}
            first={data?.firstDay ?? today}
            last={today}
            onChange={choose}
          />
          <button
            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 px-3.25 py-2 gap-2.5 border border-solid border-[#dee5f0] inline-flex items-center justify-center min-h-10.5 rounded-[9px] bg-white text-[#435976] text-[13px] hover:enabled:bg-[#edf3ff] max-xs-wide:[&[aria-label]]:px-2 max-xs-wide:last:col-span-full max-xs-wide:last:justify-self-end"
            aria-label="Défi suivant"
            disabled={selected >= today}
            onClick={() =>
              choose(challengeDay(challengeStart(selected) + CHALLENGE_DAY_MS))
            }
          >
            <ArrowRight className="shrink-0" size={18} />
          </button>
          <button
            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 px-3.25 py-2 gap-2.5 border border-solid border-[#dee5f0] inline-flex items-center justify-center min-h-10.5 rounded-[9px] bg-white text-[#435976] text-[13px] hover:enabled:bg-[#edf3ff] max-xs-wide:[&[aria-label]]:px-2 max-xs-wide:last:col-span-full max-xs-wide:last:justify-self-end"
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
          className="challenge-error px-3.75 py-3 gap-2.5 border border-solid border-[#efd5db] flex flex-wrap rounded-[9px] bg-[#fff4f6] text-[#9d3d50] text-[13px] leading-[1.8] wrap-anywhere"
          role="alert"
        >
          {error}
          <button
            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 underline"
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
        <div className="empty-state px-6.25 py-17.5 gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0]">
          Ouverture du défi…
        </div>
      ) : !challenge ? (
        <div className="empty-state px-6.25 py-17.5 gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0]">
          <h2 className="text-[#32445f] text-2xl leading-[inherit] font-bold">
            {selected === today
              ? "Le défi se prépare…"
              : "Aucun défi à cette date."}
          </h2>
          <p className="max-w-127.5 leading-[1.8]">
            Choisissez une autre journée ou revenez au défi d’aujourd’hui.
          </p>
        </div>
      ) : (
        <>
          <section
            className="challenge-kit overflow-hidden border border-solid border-[#dfe7f3] bg-white rounded-[20px]"
            aria-label="Le lot du défi"
          >
            <div className="challenge-kit-heading px-7 py-6.25 gap-5 flex items-center justify-between flex-wrap max-sm:p-5">
              <div>
                <h2 className="mx-0 my-1.75 text-[25px] font-extrabold tracking-[-0.7px]">
                  Les pièces du jour
                </h2>
                <p className="text-[13px] leading-[1.8] text-[#6e809d]">
                  Utilisez tout ou partie du lot. Les couleurs sont libres.
                </p>
              </div>
              <span
                className={cn(
                  "challenge-time px-3.25 py-2.5 gap-2 inline-flex items-center text-[#7e6e59] bg-[#f7f3ec] text-xs leading-[inherit] rounded-[9px] [&[class~='group/is-open']]:bg-[#ecf8f1] [&[class~='group/is-open']]:text-[#337c59]",
                  open ? "is-open group/is-open" : "",
                )}
              >
                <Clock3 size={16} />
                {open
                  ? `${Math.floor(remaining / 3600000)} h ${Math.floor(remaining / 60000) % 60} min restantes`
                  : "Participations closes"}
              </span>
            </div>
            <div className="challenge-stock-grid px-7 gap-2.5 grid grid-cols-6 pt-0 pb-6.25 max-sm:px-3.5 max-sm:gap-1.75 max-sm:grid-cols-3 max-sm:pb-4.5 min-sm:max-lg-narrow:grid-cols-4">
              {challenge.stock.map((item) => (
                <div
                  className="challenge-stock-card px-2.25 border border-solid border-[#e7ecf6] relative pt-5 pb-3 bg-[#f6f8fd] rounded-[12px] text-center max-sm:px-1.25"
                  key={item.type}
                >
                  <span className="absolute top-2 right-2.5 text-xs leading-[inherit] font-bold text-[#356ae6]">
                    × {item.quantity}
                  </span>
                  <PartPreview
                    className="mx-auto my-1.25 h-17.5 max-sm:h-13.75"
                    type={item.type as PartType}
                    color="#4079e8"
                  />
                  <p className="text-[#5e7293] text-[11px]">
                    {CATALOG[item.type as PartType].name}
                  </p>
                </div>
              ))}
            </div>
            <div className="challenge-kit-footer px-7 py-6.25 gap-5 flex items-center justify-between flex-wrap border-t border-solid border-t-[#e8edf5] bg-[#fafbff] max-sm:p-5">
              <p className="text-[13px] leading-[1.8] text-[#6e809d]">
                {open
                  ? "Une création par personne, modifiable jusqu’à minuit UTC."
                  : "Les constructions sont figées. Les votes et les échanges continuent."}
              </p>
              {open ? (
                isAuthenticated ? (
                  <button
                    className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 primary-link group/primary-link px-4.75 py-3 gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white rounded-[9px] text-sm leading-[inherit] font-[650] whitespace-nowrap hover:bg-[#2458ce] max-sm:w-full"
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
                    <ArrowRight className="shrink-0" size={16} />
                  </button>
                ) : (
                  <SignInTo className="text-[13px]">
                    Se connecter pour participer <ArrowRight size={16} />
                  </SignInTo>
                )
              ) : (
                data.projectId && (
                  <Link
                    className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 text-[#356ae6] text-[13px] font-semibold"
                    to="/editor/$projectId"
                    params={{ projectId: data.projectId }}
                  >
                    Retrouver mon travail privé
                  </Link>
                )
              )}
            </div>
            <p className="challenge-device-note px-5.5 hidden pt-0 pb-5 text-[#70839f] text-xs leading-[1.8] bg-[#fafbff] max-lg-narrow:block">
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
      className="challenge-entries mt-12"
      aria-labelledby="entries-title"
    >
      <div className="challenge-entries-heading gap-5 flex items-center justify-between flex-wrap mb-6.25">
        <div>
          <h2
            className="text-[25px] tracking-[-0.7px] font-extrabold max-sm:text-[23px]"
            id="entries-title"
          >
            À vous de choisir vos coups de cœur.
          </h2>
          <p className="mt-2 text-[#71839c] text-xs leading-[1.7]">
            {choices.length} / 3 votes attribués pour ce défi. Retirez un vote
            pour changer de choix.
          </p>
        </div>
        <div className="challenge-sort gap-2.5 flex items-center shrink-0 text-xs leading-[inherit] text-[#71839c]">
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
              className="challenge-sort-trigger px-2.75 py-2 border border-solid border-[#dfe7f2] w-40 min-h-9.5 rounded-[9px] bg-white text-[#455f83] cursor-pointer hover:border-[#b7caf0] hover:bg-[#f8faff] data-popup-open:border-[#b7caf0] data-popup-open:bg-[#f8faff] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="challenge-sort-menu p-1 rounded-[11px] bg-white text-[#455f83] [box-shadow:0_8px_24px_#213d6a14,0_0_0_1px_#dfe7f2]"
              align="end"
              alignItemWithTrigger={false}
            >
              <SelectItem
                className="min-h-9 rounded-[7px] cursor-pointer data-highlighted:bg-[#edf3ff] data-highlighted:text-[#2458ce] data-selected:text-[#2458ce]"
                value="recent"
              >
                Récentes
              </SelectItem>
              <SelectItem
                className="min-h-9 rounded-[7px] cursor-pointer data-highlighted:bg-[#edf3ff] data-highlighted:text-[#2458ce] data-selected:text-[#2458ce]"
                value="votes"
              >
                Les plus aimées
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {!results.length ? (
        <div className="empty-state px-6.25 py-17.5 gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0]">
          {status === "LoadingFirstPage"
            ? "Chargement des créations…"
            : open
              ? "La première idée pourrait être la vôtre."
              : "Aucune création n’a été proposée pour ce défi."}
        </div>
      ) : (
        <div className="creation-grid group/creation-grid gap-6.5 grid grid-cols-3 max-sm-narrow:gap-3.75 max-sm-narrow:grid-cols-1 min-sm-narrow:max-lg-narrow:gap-3.75 min-sm-narrow:max-lg-narrow:grid-cols-2">
          {results.map((p) => (
            <article
              className="creation-card challenge-entry group/creation-card overflow-hidden border border-solid border-[#e4eaf2] rounded-[14px] bg-white"
              key={p._id}
            >
              <Link
                className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 group/card-link"
                to="/creations/$publicationId"
                params={{ publicationId: p._id }}
              >
                <div className="thumbnail group/thumbnail aspect-4/3 bg-[#eef2f8] relative">
                  {p.thumbnailUrl && (
                    <img
                      className="object-contain size-full"
                      src={p.thumbnailUrl}
                      alt={p.title}
                      loading="lazy"
                    />
                  )}
                  <span
                    className="card-arrow group/card-arrow absolute bottom-3.75 right-3.75 bg-[#ffffffde] rounded-full grid place-items-center text-[#356ae6] [transition:background_150ms] size-8 group-hover/card-link:bg-[#356ae6] group-hover/card-link:text-white"
                    aria-hidden="true"
                  >
                    <ArrowUpRight size={19} />
                  </span>
                </div>
                <div className="card-meta group/card-meta px-5 py-4.5">
                  <h3 className="text-base leading-[inherit] font-bold">
                    {p.title}
                  </h3>
                </div>
              </Link>
              <p className="public-card-author group/public-card-author min-w-0 text-[#73829a] text-xs leading-[inherit] px-5 pt-0 pb-4">
                par{" "}
                <AuthorLink id={p.owner} name={p.author} avatar={p.avatar} />
              </p>
              <div className="challenge-entry-actions px-4 py-3 gap-2 flex justify-between items-center flex-wrap border-t border-solid border-t-[#edf0f6] bg-[#fcfcfe]">
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
                  className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 challenge-entry-comments px-2.25 py-1.5 gap-1.5 inline-flex items-center justify-center min-h-9.5 min-w-9.5 ml-auto rounded-[10px] text-[#8792a5] text-xs tabular-nums hover:bg-[#eef1f8] hover:text-[#536c90] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 group/card-link leading-normal"
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
          className="load-more group/load-more mx-auto my-8.75 block"
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
