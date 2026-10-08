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
      className="modal-backdrop p-5 inset-0 fixed bg-[#1c294b66] z-50 grid place-items-center [backdrop-filter:blur(4px)] [dialog&]:m-0 [dialog&]:border-0 [dialog&]:border-none [dialog&]:border-current [dialog&]:max-w-none [dialog&]:max-h-none [dialog&:not([open])]:hidden [dialog&::backdrop]:bg-transparent [dialog&]:size-full"
      aria-labelledby={headingId}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClose={onClose}
    >
      <form
        className="publish-dialog p-9 gap-5 relative w-full max-w-125 bg-white rounded-[20px] [box-shadow:0_20px_70px_#13224044] flex flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !disabled && title.trim()) onPublish();
        }}
      >
        <button
          type="button"
          className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 close-modal absolute right-4.5 top-4.5 text-[#9aa6b7]"
          aria-label="Fermer"
          disabled={busy}
          onClick={onClose}
        >
          <X className="shrink-0" size={20} />
        </button>
        <h2 className="text-[28px] font-[750] tracking-[-1px]" id={headingId}>
          {challenge ? "Votre participation au défi" : "Publier votre création"}
        </h2>
        <p className="text-[#7a879b] text-[13px] leading-[1.7]">
          Une version de votre scène sera visible et réutilisable dans Clik avec
          attribution. Vos prochaines modifications resteront privées.
        </p>
        <label className="gap-2 text-[13px] flex flex-col">
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
        <label className="gap-2 text-[13px] flex flex-col">
          Description{" "}
          <span className="text-[11px] text-[#96a0b1]">facultative</span>
          <textarea
            className="outline-offset-3 p-2.5 border border-solid border-[#e0e6ee] rounded-[8px]"
            maxLength={2000}
            value={description}
            disabled={busy}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={4}
          />
        </label>
        <p className="text-[#7a879b] text-[13px] leading-[1.7]">
          La miniature sera cadrée automatiquement, sans quadrillage.
        </p>
        {error && (
          <p
            className="publish-error group/publish-error text-[13px] leading-[1.7] text-[#b42318]"
            role="alert"
          >
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
