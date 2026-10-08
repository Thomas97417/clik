import { cn } from "@/lib/utils";
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
      className={cn(
        "modal-backdrop p-[20px] inset-[0] fixed bg-[#1c294b66] z-[50] grid [place-items:center] [backdrop-filter:blur(4px)] [dialog&]:m-[0] [dialog&]:border-[length:0] [dialog&]:border-none [dialog&]:border-[color:currentColor] [dialog&]:max-w-[none] [dialog&]:max-h-[none] [dialog&]:w-[100%] [dialog&]:h-[100%] [dialog&:not([open])]:hidden [dialog&::backdrop]:bg-[transparent]",
      )}
      aria-labelledby={headingId}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClose={onClose}
    >
      <form
        className={cn(
          "publish-dialog p-[36px] gap-[20px] relative w-[100%] max-w-[500px] bg-[white] rounded-[20px] [box-shadow:0_20px_70px_#13224044] flex flex-col [&_h2]:[font-size:28px] [&_h2]:font-[750] [&_h2]:tracking-[-1px] [&_p]:text-[color:#7a879b] [&_p]:[font-size:13px] [&_p]:leading-[1.7] [&_[class~='group/publish-error']]:text-[color:#b42318] [&_label]:gap-[8px] [&_label]:[font-size:13px] [&_label]:flex [&_label]:flex-col [&_label_>_span]:[font-size:11px] [&_label_>_span]:text-[color:#96a0b1] [&_textarea]:p-[10px] [&_textarea]:border-[length:1px] [&_textarea]:border-solid [&_textarea]:border-[color:#e0e6ee] [&_textarea]:rounded-[8px]",
        )}
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !disabled && title.trim()) onPublish();
        }}
      >
        <button
          type="button"
          className={cn(
            "close-modal absolute right-[18px] top-[18px] text-[color:#9aa6b7]",
          )}
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
          <p className={cn("publish-error group/publish-error")} role="alert">
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
