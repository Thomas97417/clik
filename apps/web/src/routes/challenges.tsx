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
    <main className="collection-page challenges-page">
      <div className="page-heading">
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
      <div className="challenge-navigation">
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
      {error && (
        <p className="challenge-error" role="alert">
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
        <div className="empty-state">Ouverture du défi…</div>
      ) : !challenge ? (
        <div className="empty-state">
          <h2>
            {selected === today
              ? "Le défi se prépare…"
              : "Aucun défi à cette date."}
          </h2>
          <p>Choisissez une autre journée ou revenez au défi d’aujourd’hui.</p>
        </div>
      ) : (
        <>
          <section className="challenge-kit" aria-label="Le lot du défi">
            <div className="challenge-kit-heading">
              <div>
                <h2>Les pièces du jour</h2>
                <p>Utilisez tout ou partie du lot. Les couleurs sont libres.</p>
              </div>
              <span className={`challenge-time ${open ? "is-open" : ""}`}>
                <Clock3 size={16} />
                {open
                  ? `${Math.floor(remaining / 3600000)} h ${Math.floor(remaining / 60000) % 60} min restantes`
                  : "Participations closes"}
              </span>
            </div>
            <div className="challenge-stock-grid">
              {challenge.stock.map((item) => (
                <div className="challenge-stock-card" key={item.type}>
                  <span>× {item.quantity}</span>
                  <PartPreview type={item.type as PartType} color="#4079e8" />
                  <p>{CATALOG[item.type as PartType].name}</p>
                </div>
              ))}
            </div>
            <div className="challenge-kit-footer">
              <p>
                {open
                  ? "Une création par personne, modifiable jusqu’à minuit UTC."
                  : "Les constructions sont figées. Les votes et les échanges continuent."}
              </p>
              {open ? (
                isAuthenticated ? (
                  <button
                    className="primary-link"
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
            <p className="challenge-device-note">
              Pour construire, ouvrez l’atelier sur ordinateur. Vous pouvez
              voter et commenter sur mobile.
            </p>
          </section>
          <Entries
            key={challenge._id}
            challenge={challenge}
            now={now}
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
  now,
  open,
  choices,
  initial,
}: {
  challenge: Doc<"challenges">;
  now: number;
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
    <section className="challenge-entries" aria-labelledby="entries-title">
      <div className="challenge-entries-heading">
        <div>
          <h2 id="entries-title">À vous de choisir vos coups de cœur.</h2>
          <p>
            {choices.length} / 3 votes attribués pour ce défi. Retirez un vote
            pour changer de choix.
          </p>
        </div>
        <div className="challenge-sort">
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
              className="challenge-sort-trigger"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="challenge-sort-menu"
              align="end"
              alignItemWithTrigger={false}
            >
              <SelectItem value="recent">Récentes</SelectItem>
              <SelectItem value="votes">Les plus aimées</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <ChallengeRewards challenge={challenge} now={now} />
      {!results.length ? (
        <div className="empty-state">
          {status === "LoadingFirstPage"
            ? "Chargement des créations…"
            : open
              ? "La première idée pourrait être la vôtre."
              : "Aucune création n’a été proposée pour ce défi."}
        </div>
      ) : (
        <div className="creation-grid">
          {results.map((p) => (
            <article className="creation-card challenge-entry" key={p._id}>
              <Link
                to="/creations/$publicationId"
                params={{ publicationId: p._id }}
              >
                <div className="thumbnail">
                  {p.thumbnailUrl && (
                    <img src={p.thumbnailUrl} alt={p.title} loading="lazy" />
                  )}
                  <span className="card-arrow" aria-hidden="true">
                    <ArrowUpRight size={19} />
                  </span>
                </div>
                <div className="card-meta">
                  <h3>{p.title}</h3>
                </div>
              </Link>
              <p className="public-card-author">
                par{" "}
                <AuthorLink id={p.owner} name={p.author} avatar={p.avatar} />
              </p>
              <div className="challenge-entry-actions">
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
                  className="challenge-entry-comments"
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
          className="load-more"
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
