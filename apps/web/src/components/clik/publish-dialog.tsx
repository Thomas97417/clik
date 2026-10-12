import { useEffect, useId, useRef } from "react";
import {
  AlertCircle,
  Camera,
  Globe2,
  LoaderCircle,
  RefreshCw,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  updating = false,
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
  updating?: boolean;
  error?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const introductionId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const descriptionLengthId = useId();
  const PublicationIcon = updating ? RefreshCw : challenge ? Trophy : Globe2;
  useEffect(() => {
    dialog.current?.showModal();
    titleInput.current?.focus();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal-backdrop p-4 inset-0 fixed bg-[#1c294b66] z-50 grid place-items-center [backdrop-filter:blur(4px)] [dialog&]:m-0 [dialog&]:border-0 [dialog&]:border-none [dialog&]:border-current [dialog&]:max-w-none [dialog&]:max-h-none [dialog&:not([open])]:hidden [dialog&::backdrop]:bg-transparent [dialog&]:size-full max-sm-narrow:p-3"
      aria-labelledby={headingId}
      aria-describedby={introductionId}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClose={onClose}
    >
      <form
        className="publish-dialog relative flex w-full max-w-140 max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-2xl border border-solid border-[#dfe7f3] bg-white text-[#26344c] [box-shadow:0_24px_80px_#1b2d4933] max-sm-narrow:max-h-[calc(100dvh-24px)] max-sm-narrow:rounded-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !disabled && title.trim()) onPublish();
        }}
      >
        <header className="shrink-0 px-6 pt-6 pb-5 max-sm-narrow:px-5 max-sm-narrow:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] border border-solid border-[#dfe8fb] bg-[#f0f4ff] text-[#356ae6] max-sm-narrow:size-9">
                <PublicationIcon size={19} aria-hidden="true" />
              </span>
              <h2
                className="min-w-0 text-[22px] font-semibold tracking-[-0.6px] leading-7 max-sm-narrow:text-xl max-sm-narrow:leading-6"
                id={headingId}
              >
                {challenge
                  ? "Votre participation au défi"
                  : updating
                    ? "Mettre à jour votre publication"
                    : "Publier votre création"}
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-[8px] bg-transparent text-[#7b8ba1] hover:bg-[#f0f4fa] hover:text-[#3c5373]"
              aria-label="Fermer"
              disabled={busy}
              onClick={onClose}
            >
              <X size={18} aria-hidden="true" />
            </Button>
          </div>
          <p
            id={introductionId}
            className="mt-3 text-[13px] leading-5.5 text-[#64758b]"
          >
            {updating
              ? "La version publique de votre création sera mise à jour."
              : "Une version de votre scène sera visible et réutilisable dans Clik avec attribution."}{" "}
            Vos prochaines modifications resteront privées.
          </p>
        </header>
        <div className="publish-dialog-body flex min-h-0 flex-col gap-5 overflow-y-auto px-6 pb-6 max-sm-narrow:px-5 max-sm-narrow:pb-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor={titleId}
              className="text-[13px] font-semibold text-[#455a77]"
            >
              Titre
            </label>
            <Input
              id={titleId}
              ref={titleInput}
              autoFocus
              className="h-10 rounded-[8px] border-[#dfe7f3] bg-white px-3 text-[13px] leading-5"
              placeholder="Donnez un nom à votre création"
              value={title}
              maxLength={100}
              disabled={busy}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor={descriptionId}
                className="text-[13px] font-semibold text-[#455a77]"
              >
                Description
              </label>
              <span className="text-[11px] text-[#64758b]">Facultative</span>
            </div>
            <Textarea
              id={descriptionId}
              className="min-h-28 max-h-56 resize-y rounded-[8px] border-[#dfe7f3] bg-white px-3 py-2.5 text-[13px] leading-5 md:text-[13px] md:leading-5"
              aria-describedby={descriptionLengthId}
              placeholder="Quelques mots sur l’idée, l’histoire ou les détails de votre création…"
              maxLength={2000}
              value={description}
              disabled={busy}
              onChange={(event) => onDescriptionChange(event.target.value)}
              rows={4}
            />
            <span
              id={descriptionLengthId}
              className="self-end text-[11px] tabular-nums text-[#64758b]"
            >
              {description.length} / 2 000 caractères
            </span>
          </div>
          <div className="flex items-start gap-2.5 rounded-[9px] border border-solid border-[#e5ebf4] bg-[#f8fafc] px-3 py-2.5">
            <Camera
              size={16}
              className="mt-0.5 shrink-0 text-[#7187a5]"
              aria-hidden="true"
            />
            <p className="text-xs leading-5 text-[#64758b]">
              La miniature sera cadrée automatiquement, sans quadrillage.
            </p>
          </div>
        </div>
        <footer className="flex shrink-0 flex-col gap-3 border-t border-solid border-[#e8edf5] bg-[#fafbfd] px-6 py-4 max-sm-narrow:px-5">
          {error && (
            <div
              className="publish-error flex items-start gap-2.5 rounded-[8px] border border-solid border-[#f3d8d6] bg-[#fff6f5] px-3 py-2.5 text-[13px] leading-5 text-[#af4e3a]"
              role="alert"
            >
              <AlertCircle
                size={16}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <p className="min-w-0 max-h-28 overflow-y-auto wrap-anywhere">
                {error}
              </p>
            </div>
          )}
          <div className="flex items-center justify-end gap-2.5 max-sm-narrow:flex-col max-sm-narrow:items-stretch">
            <Button
              type="button"
              variant="ghost"
              className="h-10 rounded-[8px] px-3.5 text-[13px] text-[#536888] hover:bg-[#eef2f8] hover:text-[#3c5373]"
              disabled={busy}
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="h-10 gap-2 rounded-[8px] bg-[#356ae6] px-4 text-[13px] font-semibold hover:enabled:bg-[#2458ce]"
              disabled={busy || disabled || !title.trim()}
              aria-busy={busy}
            >
              {busy ? (
                <LoaderCircle
                  size={16}
                  className="shrink-0 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <PublicationIcon
                  size={16}
                  className="shrink-0"
                  aria-hidden="true"
                />
              )}
              {busy
                ? updating
                  ? "Mise à jour…"
                  : "Publication…"
                : challenge
                  ? "Valider ma participation"
                  : updating
                    ? "Mettre à jour la publication"
                    : "Publier cette version"}
            </Button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
