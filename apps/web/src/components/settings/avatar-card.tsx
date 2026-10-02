import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Shuffle, X, ArrowUpRight } from "lucide-react";
import {
  CROWNS,
  RINGS,
  nextAvatar,
  type AvatarDescriptor,
} from "@clik/avatars";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import BrickAvatar from "@/components/ui/brick-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export default function AvatarCard({ avatar }: { avatar: AvatarDescriptor }) {
  const save = useMutation(api.avatars.save);
  const [open, setOpen] = useState(false);
  const rewards = useQuery(api.rewards.mine, open ? {} : "skip");
  const [draft, setDraft] = useState<AvatarDescriptor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const displayed = draft ?? avatar;
  const changed =
    displayed.seed !== avatar.seed ||
    displayed.crown !== avatar.crown ||
    displayed.ring !== avatar.ring;
  const choose = (patch: Partial<AvatarDescriptor>) =>
    setDraft({ ...displayed, ...patch });
  const changeOpen = (next: boolean) => {
    if (busy) return;
    setOpen(next);
    setDraft(null);
    setError("");
    if (next) setMessage("");
  };
  const generate = () => {
    choose(nextAvatar(displayed, () => crypto.randomUUID()));
    setError("");
    setMessage("Nouvelle combinaison proposée.");
  };
  const persist = async () => {
    if (!changed || busy) return;
    setBusy(true);
    setError("");
    try {
      await save({
        ...(displayed.seed !== avatar.seed
          ? { seed: displayed.seed, version: displayed.version }
          : {}),
        crown: displayed.crown ?? null,
        ring: displayed.ring ?? null,
      });
      setOpen(false);
      setDraft(null);
      setMessage("Avatar enregistré.");
    } catch {
      setError(
        "L’avatar n’a pas pu être enregistré. Réessayez, votre proposition est conservée.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <article className="avatar-settings-card">
        <div className="avatar-settings-current">
          <BrickAvatar avatar={avatar} size={96} label="Votre avatar actuel" />
        </div>
        <div className="avatar-settings-copy">
          <h3>Votre avatar</h3>
          <p>
            Quelques briques, une signature bien à vous. Assemblez votre motif,
            vos couronnes et vos contours.
          </p>
          <div className="avatar-equipped" aria-label="Accessoires équipés">
            {avatar.crown && (
              <span>
                Couronne{" "}
                {CROWNS.find((c) => c.id === avatar.crown)?.name.toLowerCase()}
              </span>
            )}
            {avatar.ring && (
              <span>{RINGS.find((r) => r.id === avatar.ring)?.name}</span>
            )}
          </div>
          <DialogTrigger render={<Button variant="outline" />}>
            Personnaliser mon avatar{" "}
            <ArrowUpRight size={16} aria-hidden="true" />
          </DialogTrigger>
          {!open && message === "Avatar enregistré." && (
            <p className="avatar-settings-status" role="status">
              {message}
            </p>
          )}
        </div>
      </article>
      <DialogContent
        className="avatar-dialog"
        showCloseButton={false}
        aria-busy={busy}
      >
        <DialogHeader className="avatar-dialog-heading">
          <DialogTitle>Un avatar à votre façon.</DialogTitle>
          <DialogDescription>
            Un motif, quelques détails, et votre touche personnelle.
          </DialogDescription>
          <DialogClose
            render={<Button variant="ghost" size="icon" disabled={busy} />}
            className="avatar-dialog-close"
            aria-label="Fermer la personnalisation"
          >
            <X size={18} />
          </DialogClose>
        </DialogHeader>
        <div className="avatar-dialog-body">
          <div className="avatar-dialog-preview-panel">
            <div className="avatar-settings-preview">
              <BrickAvatar
                avatar={displayed}
                size={128}
                label="Aperçu de votre avatar"
              />
            </div>
            <h3>Votre signature en briques</h3>
            <p>Essayez une autre combinaison de formes et de couleurs.</p>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={generate}
            >
              <Shuffle size={16} aria-hidden="true" /> Nouveau motif
            </Button>
            <p className="avatar-dialog-preview-note">
              Vos accessoires restent en place quand vous changez de motif.
            </p>
            <span className="sr-only" role="status">
              {message}
            </span>
          </div>
          <div className="avatar-dialog-options">
            <div className="avatar-wardrobe" aria-busy={rewards === undefined}>
              <fieldset disabled={busy || !rewards}>
                <legend>
                  Couronnes <span>Vos places sur le podium</span>
                </legend>
                <div className="avatar-reward-options avatar-crown-options">
                  <button
                    type="button"
                    className="avatar-reward-option"
                    aria-pressed={!displayed.crown}
                    onClick={() => {
                      choose({ crown: undefined });
                      setError("");
                      setMessage("");
                    }}
                  >
                    <BrickAvatar
                      avatar={{
                        ...displayed,
                        crown: undefined,
                        ring: undefined,
                      }}
                      size={48}
                    />
                    <strong>Aucune</strong>
                    <small>Sans couronne</small>
                  </button>
                  {CROWNS.map((crown) => {
                    const earned = rewards?.rewards.find(
                      (r) => r.key === crown.id,
                    );
                    return (
                      <div key={crown.id} className="avatar-reward-item">
                        <button
                          type="button"
                          className="avatar-reward-option"
                          disabled={!earned}
                          aria-pressed={displayed.crown === crown.id}
                          onClick={() => {
                            choose({ crown: crown.id });
                            setError("");
                            setMessage("");
                          }}
                        >
                          <BrickAvatar
                            avatar={{
                              ...displayed,
                              crown: crown.id,
                              ring: undefined,
                            }}
                            size={48}
                          />
                          <strong>{crown.name}</strong>
                          <small>
                            {earned
                              ? "Débloquée"
                              : `${crown.rank === 1 ? "1re" : `${crown.rank}e`} place · Verrouillée`}
                          </small>
                        </button>
                        {earned?.day && (
                          <Link
                            className="avatar-reward-source"
                            onClick={(event) => {
                              if (busy) event.preventDefault();
                              else changeOpen(false);
                            }}
                            to="/challenges"
                            search={{ date: earned.day }}
                          >
                            Défi du{" "}
                            {new Date(
                              `${earned.day}T00:00:00Z`,
                            ).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              timeZone: "UTC",
                            })}
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset disabled={busy || !rewards}>
                <legend>
                  Contours{" "}
                  <span>
                    {rewards
                      ? `${rewards.count} défi${rewards.count > 1 ? "s" : ""} publié${rewards.count > 1 ? "s" : ""}`
                      : "Chargement…"}
                  </span>
                </legend>
                <div className="avatar-reward-options avatar-ring-options">
                  <button
                    type="button"
                    className="avatar-reward-option"
                    aria-pressed={!displayed.ring}
                    onClick={() => {
                      choose({ ring: undefined });
                      setError("");
                      setMessage("");
                    }}
                  >
                    <BrickAvatar
                      avatar={{
                        ...displayed,
                        crown: undefined,
                        ring: undefined,
                      }}
                      size={48}
                    />
                    <strong>Aucun</strong>
                    <small>Sans contour</small>
                  </button>
                  {RINGS.map((ring) => {
                    const earned = rewards?.rewards.some(
                      (r) => r.key === ring.id,
                    );
                    return (
                      <button
                        key={ring.id}
                        type="button"
                        className="avatar-reward-option"
                        disabled={!earned}
                        aria-pressed={displayed.ring === ring.id}
                        onClick={() => {
                          choose({ ring: ring.id });
                          setError("");
                          setMessage("");
                        }}
                      >
                        <BrickAvatar
                          avatar={{
                            ...displayed,
                            crown: undefined,
                            ring: ring.id,
                          }}
                          size={48}
                        />
                        <strong>{ring.name}</strong>
                        <small>
                          {earned
                            ? `${ring.threshold} défi${ring.threshold > 1 ? "s" : ""} · Débloqué`
                            : `${Math.min(rewards?.count ?? 0, ring.threshold)} / ${ring.threshold} défis · Verrouillé`}
                        </small>
                        {!earned && (
                          <progress
                            aria-label={`Progression ${ring.name}`}
                            value={Math.min(
                              rewards?.count ?? 0,
                              ring.threshold,
                            )}
                            max={ring.threshold}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <p className="avatar-reward-note">
                Les récompenses restent à vous. Associez une couronne et un
                contour, ou gardez votre avatar tel quel.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="avatar-dialog-footer">
          <div className="avatar-dialog-feedback">
            {error ? (
              <p role="alert">{error}</p>
            ) : (
              <p>
                {changed
                  ? "Vos changements sont prêts à être enregistrés."
                  : "Votre avatar actuel. À vous de le réinventer."}
              </p>
            )}
          </div>
          <div className="avatar-dialog-actions">
            <DialogClose render={<Button variant="outline" disabled={busy} />}>
              Fermer
            </DialogClose>
            <Button
              type="button"
              disabled={!changed || busy}
              onClick={() => void persist()}
            >
              {busy ? "Enregistrement…" : "Valider les changements"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
