import { useState } from "react";
import { useMutation } from "convex/react";
import { Shuffle } from "lucide-react";
import { nextAvatar, type AvatarDescriptor } from "@clik/avatars";
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
  const [draft, setDraft] = useState<AvatarDescriptor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const displayed = draft ?? avatar;
  const generate = () => {
    setDraft(nextAvatar(displayed, () => crypto.randomUUID()));
    setError("");
    setMessage("Nouvel avatar proposé. Enregistrez-le pour l’utiliser.");
  };
  const persist = async () => {
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    try {
      await save(draft);
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
