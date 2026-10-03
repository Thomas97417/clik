import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PublishDialog({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onClose,
  onPublish,
  busy,
  disabled = false,
  challenge = false,
  error,
}: {
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onClose: () => void;
  onPublish: () => void;
  busy: boolean;
  disabled?: boolean;
  challenge?: boolean;
  error?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const headingId = useId();
  useEffect(() => {
    dialog.current?.showModal();
    titleInput.current?.focus();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal-backdrop"
      aria-labelledby={headingId}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClose={onClose}
    >
      <form
        className="publish-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !disabled && title.trim()) onPublish();
        }}
      >
        <button
          type="button"
          className="close-modal"
          aria-label="Fermer"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2 id={headingId}>
          {challenge ? "Votre participation au défi" : "Publier votre création"}
        </h2>
        <p>
          Une version de votre scène sera visible et réutilisable dans Clik avec
          attribution. Vos prochaines modifications resteront privées.
        </p>
        <label>
          Titre
          <Input
            ref={titleInput}
            autoFocus
            value={title}
            maxLength={100}
            disabled={busy}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </label>
        <label>
          Description <span>facultative</span>
          <textarea
            maxLength={2000}
            value={description}
            disabled={busy}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={4}
          />
        </label>
        <p>La miniature sera cadrée automatiquement, sans quadrillage.</p>
        {error && (
          <p className="publish-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || disabled || !title.trim()}>
          {busy
            ? "Publication…"
            : challenge
              ? "Valider ma participation"
              : "Publier cette version"}
        </Button>
      </form>
    </dialog>
  );
}
