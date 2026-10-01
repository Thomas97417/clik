import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Shuffle } from "lucide-react";
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
  SettingsCard,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
} from "./settings-card";

export default function AvatarCard({ avatar }: { avatar: AvatarDescriptor }) {
  const save = useMutation(api.avatars.save);
  const rewards = useQuery(api.rewards.mine);
  const [draft, setDraft] = useState<AvatarDescriptor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const displayed = draft ?? avatar;
  const generate = () => {
    setDraft({
      ...displayed,
      ...nextAvatar(displayed, () => crypto.randomUUID()),
    });
    setError("");
    setMessage("Nouvel avatar proposé. Enregistrez-le pour l’utiliser.");
  };
  const persist = async () => {
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    try {
      await save({
        ...(draft.seed !== avatar.seed
          ? { seed: draft.seed, version: draft.version }
          : {}),
        crown: draft.crown ?? null,
        ring: draft.ring ?? null,
      });
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
    <SettingsCard className="avatar-settings-card">
      <SettingsCardContent>
        <SettingsCardHeader
          title="Votre avatar"
          description="Quelques briques, une signature bien à vous."
        />
        <div className="avatar-settings-preview">
          <BrickAvatar
            avatar={displayed}
            size={96}
            label={draft ? "Aperçu du nouvel avatar" : "Votre avatar actuel"}
          />
          <div>
            <p>
              Essayez une nouvelle combinaison de formes et de couleurs, puis
              gardez celle qui vous ressemble.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={generate}
            >
              <Shuffle size={16} aria-hidden="true" /> Nouvel avatar
            </Button>
          </div>
        </div>
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
                  setDraft({ ...displayed, crown: undefined });
                  setError("");
                  setMessage("");
                }}
              >
                <BrickAvatar
                  avatar={{ ...displayed, crown: undefined, ring: undefined }}
                  size={48}
                />
                <strong>Aucune</strong>
                <small>Sans couronne</small>
              </button>
              {CROWNS.map((crown) => {
                const earned = rewards?.rewards.find((r) => r.key === crown.id);
                return (
                  <div key={crown.id} className="avatar-reward-item">
                    <button
                      type="button"
                      className="avatar-reward-option"
                      disabled={!earned}
                      aria-pressed={displayed.crown === crown.id}
                      onClick={() => {
                        setDraft({ ...displayed, crown: crown.id });
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
                        to="/challenges"
                        search={{ date: earned.day }}
                      >
                        Défi du{" "}
                        {new Date(`${earned.day}T00:00:00Z`).toLocaleDateString(
                          "fr-FR",
                          { day: "numeric", month: "short", timeZone: "UTC" },
                        )}
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
                  setDraft({ ...displayed, ring: undefined });
                  setError("");
                  setMessage("");
                }}
              >
                <BrickAvatar
                  avatar={{ ...displayed, crown: undefined, ring: undefined }}
                  size={48}
                />
                <strong>Aucun</strong>
                <small>Sans contour</small>
              </button>
              {RINGS.map((ring) => {
                const earned = rewards?.rewards.some((r) => r.key === ring.id);
                return (
                  <button
                    key={ring.id}
                    type="button"
                    className="avatar-reward-option"
                    disabled={!earned}
                    aria-pressed={displayed.ring === ring.id}
                    onClick={() => {
                      setDraft({ ...displayed, ring: ring.id });
                      setError("");
                      setMessage("");
                    }}
                  >
                    <BrickAvatar
                      avatar={{ ...displayed, crown: undefined, ring: ring.id }}
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
                        value={Math.min(rewards?.count ?? 0, ring.threshold)}
                        max={ring.threshold}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <p className="avatar-reward-note">
            Les récompenses restent à vous. Associez une couronne et un contour,
            ou gardez votre avatar tel quel.
          </p>
        </div>
        <p className="avatar-settings-status" role="status">
          {message || "Votre avatar vous accompagne partout sur Clik."}
        </p>
        {error && (
          <p className="avatar-settings-error" role="alert">
            {error}
          </p>
        )}
      </SettingsCardContent>
      {draft && (
        <SettingsCardFooter className="avatar-settings-actions">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setDraft(null);
              setError("");
              setMessage("Avatar actuel conservé.");
            }}
          >
            Annuler
          </Button>
          <Button type="button" disabled={busy} onClick={() => void persist()}>
            {busy ? "Enregistrement…" : "Enregistrer l’avatar"}
          </Button>
        </SettingsCardFooter>
      )}
    </SettingsCard>
  );
}
