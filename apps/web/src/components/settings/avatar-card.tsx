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
      <article className="avatar-settings-card group/avatar-settings-card overflow-hidden p-7 gap-6.5 border border-solid border-[#dbe5f6] flex items-center mb-4 rounded-2xl [background:linear-gradient(120deg,#edf3fe,#fffaf5)] max-sm:p-5 max-sm:gap-4.5 max-sm:items-start max-sm:flex-col">
        <div className="avatar-settings-current p-3 border border-solid border-white shrink-0 bg-[#ffffff99] rounded-[22px] transform-[rotate(-4deg)] max-sm:p-2">
          <BrickAvatar avatar={avatar} size={96} label="Votre avatar actuel" />
        </div>
        <div className="avatar-settings-copy min-w-0">
          <h3 className="mx-0 mt-0 mb-2 text-lg leading-[inherit] font-[650] tracking-[-0.4px]">
            Votre avatar
          </h3>
          <p className="mx-0 max-w-97.5 text-xs leading-[1.75] text-[#697a93] mt-0 mb-3.5">
            Quelques briques, une signature bien à vous. Assemblez votre motif,
            vos couronnes et vos contours.
          </p>
          <div
            className="avatar-equipped gap-1.5 flex flex-wrap mb-3 empty:hidden"
            aria-label="Accessoires équipés"
          >
            {avatar.crown && (
              <span className="px-2 py-0.75 border border-solid border-[#dce5f3] bg-[#ffffffa6] rounded-[5px] text-[10px] text-[#697a93]">
                Couronne{" "}
                {CROWNS.find((c) => c.id === avatar.crown)?.name.toLowerCase()}
              </span>
            )}
            {avatar.ring && (
              <span className="px-2 py-0.75 border border-solid border-[#dce5f3] bg-[#ffffffa6] rounded-[5px] text-[10px] text-[#697a93]">
                {RINGS.find((r) => r.id === avatar.ring)?.name}
              </span>
            )}
          </div>
          <DialogTrigger
            render={
              <Button
                className="px-3.5 py-0 gap-2.25 border-[#cddbf1] h-9.5 rounded-[8px] bg-[#ffffffbf] text-[#315a9e] aria-expanded:text-[#315a9e] hover:text-[#315a9e] focus-visible:border-[#cddbf1]"
                variant="outline"
              />
            }
          >
            Personnaliser mon avatar{" "}
            <ArrowUpRight
              className="size-4 pointer-events-none shrink-0"
              size={16}
              aria-hidden="true"
            />
          </DialogTrigger>
          {!open && message === "Avatar enregistré." && (
            <p
              className="avatar-settings-status group/avatar-settings-status mx-0 max-w-97.5 mt-2.5 mb-0 text-[11px] text-[#39836a]"
              role="status"
            >
              {message}
            </p>
          )}
        </div>
      </article>
      <DialogContent
        className="avatar-dialog data-[slot=dialog-content]:p-0 data-[slot=dialog-content]:gap-0 data-[slot=dialog-content]:overflow-hidden data-[slot=dialog-content]:w-[min(850px,calc(100vw-40px))] data-[slot=dialog-content]:max-w-none data-[slot=dialog-content]:max-h-[calc(100dvh-48px)] data-[slot=dialog-content]:rounded-[20px] data-[slot=dialog-content]:bg-white data-[slot=dialog-content]:text-[#26344c] data-[slot=dialog-content]:flex data-[slot=dialog-content]:flex-col data-[slot=dialog-content]:[box-shadow:0_24px_100px_#18345b30] max-sm:data-[slot=dialog-content]:w-[calc(100vw-20px)] max-sm:data-[slot=dialog-content]:max-h-[calc(100dvh-24px)] max-sm:data-[slot=dialog-content]:rounded-2xl motion-reduce:data-[slot=dialog-content]:animate-none"
        showCloseButton={false}
        aria-busy={busy}
      >
        <DialogHeader className="avatar-dialog-heading relative pt-6.5 pr-15 pb-5.5 pl-7 shrink-0 border-b border-solid border-b-[#e4eaf3] max-sm:pt-5 max-sm:pr-12 max-sm:pb-4 max-sm:pl-5">
          <DialogTitle className="text-[23px] font-bold leading-tight tracking-[-0.7px] max-sm:text-xl">
            Un avatar à votre façon.
          </DialogTitle>
          <DialogDescription className="text-xs leading-[1.7] text-[#77869c] mt-1">
            Un motif, quelques détails, et votre touche personnelle.
          </DialogDescription>
          <DialogClose
            render={<Button variant="ghost" size="icon" disabled={busy} />}
            className="avatar-dialog-close absolute top-5.5 right-5 rounded-[8px] max-sm:top-4 max-sm:right-3"
            aria-label="Fermer la personnalisation"
          >
            <X className="size-4 pointer-events-none shrink-0" size={18} />
          </DialogClose>
        </DialogHeader>
        <div className="avatar-dialog-body overflow-hidden grid grid-cols-[245px_minmax(0,1fr)] min-h-0 max-sm:block max-sm:overflow-y-auto max-sm:overscroll-contain">
          <div className="avatar-dialog-preview-panel px-5 py-9.5 gap-4 flex flex-col items-center text-center bg-[#f1f5fc] max-sm:py-5 max-sm:grid max-sm:text-left max-sm:gap-y-2 max-sm:grid-cols-[90px_minmax(0,1fr)]">
            <div className="avatar-settings-preview group/avatar-settings-preview p-4 border border-solid border-white grid place-items-center bg-[#ffffffa6] rounded-3xl [box-shadow:0_8px_28px_#27457508] max-sm:p-1.5 max-sm:rounded-[15px] max-sm:row-[1/4]">
              <BrickAvatar
                className="max-sm:size-19"
                avatar={displayed}
                size={128}
                label="Aperçu de votre avatar"
              />
            </div>
            <h3 className="m-0 text-[13px] font-semibold max-sm:text-xs max-sm:leading-[inherit]">
              Votre signature en briques
            </h3>
            <p className="m-0 text-xs leading-[1.7] text-[#74849d] max-sm:text-[11px]">
              Essayez une autre combinaison de formes et de couleurs.
            </p>
            <Button
              className="px-3.25 gap-2 rounded-[8px] min-h-9.5 bg-white max-sm:px-2 max-sm:min-h-8.5 max-sm:justify-self-start max-sm:text-[11px] leading-(--text-xs--line-height)"
              type="button"
              variant="outline"
              disabled={busy}
              onClick={generate}
            >
              <Shuffle
                className="size-4 pointer-events-none shrink-0"
                size={16}
                aria-hidden="true"
              />{" "}
              Nouveau motif
            </Button>
            <p className="avatar-dialog-preview-note group/avatar-dialog-preview-note m-0 text-[#74849d] text-[10px] max-sm:col-span-full max-sm:text-center leading-[1.7]">
              Vos accessoires restent en place quand vous changez de motif.
            </p>
            <span className="sr-only" role="status">
              {message}
            </span>
          </div>
          <div className="avatar-dialog-options p-6 min-w-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] max-sm:p-5 max-sm:overflow-visible">
            <div
              className="avatar-wardrobe group/avatar-wardrobe gap-6 grid mt-0"
              aria-busy={rewards === undefined}
            >
              <fieldset
                className="p-0 m-0 border-0 border-none border-current min-w-0"
                disabled={busy || !rewards}
              >
                <legend className="w-full mb-3 text-sm leading-[inherit] font-semibold text-[#243753]">
                  Couronnes{" "}
                  <span className="block mt-0.75 text-xs leading-[inherit] font-normal text-[#697b94]">
                    Vos places sur le podium
                  </span>
                </legend>
                <div className="avatar-reward-options avatar-crown-options gap-2 grid grid-cols-4 max-sm:grid-cols-2">
                  <button
                    type="button"
                    className="outline-offset-3 avatar-reward-option group/avatar-reward-option px-1.75 gap-2 border border-solid border-[#e0e7f1] flex flex-col items-center bg-white text-[#344760] text-center cursor-pointer [transition:border-color_150ms,background_150ms] hover:enabled:border-[#8eadee] hover:enabled:bg-[#f7f9ff] aria-pressed:border-[#356ae6] aria-pressed:[box-shadow:inset_0_0_0_1px_#356ae6] aria-pressed:bg-[#f2f6ff] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 disabled:opacity-100 disabled:cursor-not-allowed disabled:bg-[#f7f8fa] size-full py-3 rounded-[10px]"
                    aria-pressed={!displayed.crown}
                    onClick={() => {
                      choose({ crown: undefined });
                      setError("");
                      setMessage("");
                    }}
                  >
                    <BrickAvatar
                      className="group-disabled/avatar-reward-option:opacity-55"
                      avatar={{
                        ...displayed,
                        crown: undefined,
                        ring: undefined,
                      }}
                      size={48}
                    />
                    <strong className="text-[11px] font-semibold leading-[1.4]">
                      Aucune
                    </strong>
                    <small className="text-[10px] leading-normal text-[#65758e]">
                      Sans couronne
                    </small>
                  </button>
                  {CROWNS.map((crown) => {
                    const earned = rewards?.rewards.find(
                      (r) => r.key === crown.id,
                    );
                    return (
                      <div
                        key={crown.id}
                        className="avatar-reward-item min-w-0 flex flex-col"
                      >
                        <button
                          type="button"
                          className="outline-offset-3 avatar-reward-option group/avatar-reward-option px-1.75 gap-2 border border-solid border-[#e0e7f1] flex flex-col items-center bg-white text-[#344760] text-center cursor-pointer [transition:border-color_150ms,background_150ms] hover:enabled:border-[#8eadee] hover:enabled:bg-[#f7f9ff] aria-pressed:border-[#356ae6] aria-pressed:[box-shadow:inset_0_0_0_1px_#356ae6] aria-pressed:bg-[#f2f6ff] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 disabled:opacity-100 disabled:cursor-not-allowed disabled:bg-[#f7f8fa] size-full py-3 rounded-[10px]"
                          disabled={!earned}
                          aria-pressed={displayed.crown === crown.id}
                          onClick={() => {
                            choose({ crown: crown.id });
                            setError("");
                            setMessage("");
                          }}
                        >
                          <BrickAvatar
                            className="group-disabled/avatar-reward-option:opacity-55"
                            avatar={{
                              ...displayed,
                              crown: crown.id,
                              ring: undefined,
                            }}
                            size={48}
                          />
                          <strong className="text-[11px] font-semibold leading-[1.4]">
                            {crown.name}
                          </strong>
                          <small className="text-[10px] leading-normal text-[#65758e]">
                            {earned
                              ? "Débloquée"
                              : `${crown.rank === 1 ? "1re" : `${crown.rank}e`} place · Verrouillée`}
                          </small>
                        </button>
                        {earned?.day && (
                          <Link
                            className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 avatar-reward-source pt-1.75 text-center text-[#356ae6] text-[10px] hover:underline"
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
              <fieldset
                className="p-0 m-0 border-0 border-none border-current min-w-0"
                disabled={busy || !rewards}
              >
                <legend className="w-full mb-3 text-sm leading-[inherit] font-semibold text-[#243753]">
                  Contours{" "}
                  <span className="block mt-0.75 text-xs leading-[inherit] font-normal text-[#697b94]">
                    {rewards
                      ? `${rewards.count} défi${rewards.count > 1 ? "s" : ""} publié${rewards.count > 1 ? "s" : ""}`
                      : "Chargement…"}
                  </span>
                </legend>
                <div className="avatar-reward-options avatar-ring-options gap-2 grid grid-cols-3 max-sm:grid-cols-2">
                  <button
                    type="button"
                    className="outline-offset-3 avatar-reward-option group/avatar-reward-option px-1.75 gap-2 border border-solid border-[#e0e7f1] flex flex-col items-center bg-white text-[#344760] text-center cursor-pointer [transition:border-color_150ms,background_150ms] hover:enabled:border-[#8eadee] hover:enabled:bg-[#f7f9ff] aria-pressed:border-[#356ae6] aria-pressed:[box-shadow:inset_0_0_0_1px_#356ae6] aria-pressed:bg-[#f2f6ff] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 disabled:opacity-100 disabled:cursor-not-allowed disabled:bg-[#f7f8fa] size-full py-3 rounded-[10px]"
                    aria-pressed={!displayed.ring}
                    onClick={() => {
                      choose({ ring: undefined });
                      setError("");
                      setMessage("");
                    }}
                  >
                    <BrickAvatar
                      className="group-disabled/avatar-reward-option:opacity-55"
                      avatar={{
                        ...displayed,
                        crown: undefined,
                        ring: undefined,
                      }}
                      size={48}
                    />
                    <strong className="text-[11px] font-semibold leading-[1.4]">
                      Aucun
                    </strong>
                    <small className="text-[10px] leading-normal text-[#65758e]">
                      Sans contour
                    </small>
                  </button>
                  {RINGS.map((ring) => {
                    const earned = rewards?.rewards.some(
                      (r) => r.key === ring.id,
                    );
                    return (
                      <button
                        key={ring.id}
                        type="button"
                        className="outline-offset-3 avatar-reward-option group/avatar-reward-option px-1.75 gap-2 border border-solid border-[#e0e7f1] flex flex-col items-center bg-white text-[#344760] text-center cursor-pointer [transition:border-color_150ms,background_150ms] hover:enabled:border-[#8eadee] hover:enabled:bg-[#f7f9ff] aria-pressed:border-[#356ae6] aria-pressed:[box-shadow:inset_0_0_0_1px_#356ae6] aria-pressed:bg-[#f2f6ff] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 disabled:opacity-100 disabled:cursor-not-allowed disabled:bg-[#f7f8fa] size-full py-3 rounded-[10px]"
                        disabled={!earned}
                        aria-pressed={displayed.ring === ring.id}
                        onClick={() => {
                          choose({ ring: ring.id });
                          setError("");
                          setMessage("");
                        }}
                      >
                        <BrickAvatar
                          className="group-disabled/avatar-reward-option:opacity-55"
                          avatar={{
                            ...displayed,
                            crown: undefined,
                            ring: ring.id,
                          }}
                          size={48}
                        />
                        <strong className="text-[11px] font-semibold leading-[1.4]">
                          {ring.name}
                        </strong>
                        <small className="text-[10px] leading-normal text-[#65758e]">
                          {earned
                            ? `${ring.threshold} défi${ring.threshold > 1 ? "s" : ""} · Débloqué`
                            : `${Math.min(rewards?.count ?? 0, ring.threshold)} / ${ring.threshold} défis · Verrouillé`}
                        </small>
                        {!earned && (
                          <progress
                            className="border-0 border-none border-current w-3/4 h-1 accent-[#356ae6]"
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
              <p className="avatar-reward-note m-0 text-xs text-[#697b94] leading-[1.6]">
                Les récompenses restent à vous. Associez une couronne et un
                contour, ou gardez votre avatar tel quel.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="avatar-dialog-footer data-[slot=dialog-footer]:px-6 data-[slot=dialog-footer]:py-4 data-[slot=dialog-footer]:gap-4 data-[slot=dialog-footer]:shrink-0 data-[slot=dialog-footer]:flex data-[slot=dialog-footer]:items-center data-[slot=dialog-footer]:flex-row data-[slot=dialog-footer]:justify-between data-[slot=dialog-footer]:border-t data-[slot=dialog-footer]:border-solid data-[slot=dialog-footer]:border-t-[#e4eaf3] data-[slot=dialog-footer]:bg-[#fafbfd] max-sm:data-[slot=dialog-footer]:px-4 max-sm:data-[slot=dialog-footer]:py-3 max-sm:data-[slot=dialog-footer]:gap-2.5 max-sm:data-[slot=dialog-footer]:items-stretch max-sm:data-[slot=dialog-footer]:flex-col">
          <div className="avatar-dialog-feedback max-w-85 text-[11px] leading-[1.6] text-[#77869c] max-sm:max-w-none max-sm:text-[10px]">
            {error ? (
              <p className="text-[#b4473d]" role="alert">
                {error}
              </p>
            ) : (
              <p>
                {changed
                  ? "Vos changements sont prêts à être enregistrés."
                  : "Votre avatar actuel. À vous de le réinventer."}
              </p>
            )}
          </div>
          <div className="avatar-dialog-actions gap-2 flex shrink-0 max-sm:justify-end">
            <DialogClose
              render={
                <Button
                  className="px-3.75 rounded-[8px] min-h-10 max-sm:px-2.75 max-sm:text-[11px] leading-(--text-xs--line-height)"
                  variant="outline"
                  disabled={busy}
                />
              }
            >
              Fermer
            </DialogClose>
            <Button
              className="px-3.75 rounded-[8px] min-h-10 max-sm:px-2.75 max-sm:text-[11px] leading-(--text-xs--line-height)"
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
