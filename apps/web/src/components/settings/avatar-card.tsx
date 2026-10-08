import { cn } from "@/lib/utils";
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
      <article
        className={cn(
          "avatar-settings-card group/avatar-settings-card overflow-hidden",
        )}
      >
        <div
          className={cn(
            "avatar-settings-current p-[12px] border-[length:1px] border-solid border-[color:#fff] shrink-[0] bg-[#ffffff99] rounded-[22px] [transform:rotate(-4deg)] [@media(width<=640px)]:p-[8px]",
          )}
        >
          <BrickAvatar avatar={avatar} size={96} label="Votre avatar actuel" />
        </div>
        <div
          className={cn(
            "avatar-settings-copy min-w-[0] [&_h3]:mx-[0] [&_h3]:mt-[0] [&_h3]:mb-[8px] [&_h3]:[font-size:18px] [&_h3]:font-[650] [&_h3]:tracking-[-0.4px] [&_>_p]:mx-[0] [&_>_p]:max-w-[390px] [&_>_p]:[font-size:12px] [&_>_p]:leading-[1.75] [&_>_p]:text-[color:#697a93] [&_>_p]:mt-[0] [&_>_p]:mb-[14px] [&&_>_button]:px-[14px] [&&_>_button]:py-[0] [&&_>_button]:gap-[9px] [&&_>_button]:border-[color:#cddbf1] [&&_>_button]:h-[38px] [&&_>_button]:rounded-[8px] [&&_>_button]:bg-[#ffffffbf] [&&_>_button]:text-[color:#315a9e] [&_>_[class~='group/avatar-settings-status']]:mx-[0] [&_>_[class~='group/avatar-settings-status']]:mt-[10px] [&_>_[class~='group/avatar-settings-status']]:mb-[0] [&_>_[class~='group/avatar-settings-status']]:[font-size:11px] [&_>_[class~='group/avatar-settings-status']]:text-[color:#39836a]",
          )}
        >
          <h3>Votre avatar</h3>
          <p>
            Quelques briques, une signature bien à vous. Assemblez votre motif,
            vos couronnes et vos contours.
          </p>
          <div
            className={cn(
              "avatar-equipped gap-[6px] flex flex-wrap mb-[12px] [&:empty]:hidden [&_>_span]:px-[8px] [&_>_span]:py-[3px] [&_>_span]:border-[length:1px] [&_>_span]:border-solid [&_>_span]:border-[color:#dce5f3] [&_>_span]:bg-[#ffffffa6] [&_>_span]:rounded-[5px] [&_>_span]:[font-size:10px] [&_>_span]:text-[color:#697a93]",
            )}
            aria-label="Accessoires équipés"
          >
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
            <p
              className={cn(
                "avatar-settings-status group/avatar-settings-status",
              )}
              role="status"
            >
              {message}
            </p>
          )}
        </div>
      </article>
      <DialogContent
        className={cn(
          "avatar-dialog [&[data-slot='dialog-content']]:p-[0] [&[data-slot='dialog-content']]:gap-[0] [&[data-slot='dialog-content']]:overflow-hidden [&[data-slot='dialog-content']]:w-[min(850px,_calc(100vw_-_40px))] [&[data-slot='dialog-content']]:max-w-[none] [&[data-slot='dialog-content']]:max-h-[calc(100dvh_-_48px)] [&[data-slot='dialog-content']]:rounded-[20px] [&[data-slot='dialog-content']]:bg-[#fff] [&[data-slot='dialog-content']]:text-[color:#26344c] [&[data-slot='dialog-content']]:flex [&[data-slot='dialog-content']]:flex-col [&[data-slot='dialog-content']]:[box-shadow:0_24px_100px_#18345b30] [@media(width<=640px)]:[&[data-slot='dialog-content']]:w-[calc(100vw_-_20px)] [@media(width<=640px)]:[&[data-slot='dialog-content']]:max-h-[calc(100dvh_-_24px)] [@media(width<=640px)]:[&[data-slot='dialog-content']]:rounded-[16px] [&_[class~='group/avatar-settings-preview']]:p-[16px] [&_[class~='group/avatar-settings-preview']]:border-[length:1px] [&_[class~='group/avatar-settings-preview']]:border-solid [&_[class~='group/avatar-settings-preview']]:border-[color:#fff] [&_[class~='group/avatar-settings-preview']]:grid [&_[class~='group/avatar-settings-preview']]:[place-items:center] [&_[class~='group/avatar-settings-preview']]:bg-[#ffffffa6] [&_[class~='group/avatar-settings-preview']]:rounded-[24px] [&_[class~='group/avatar-settings-preview']]:[box-shadow:0_8px_28px_#27457508] [@media(width<=640px)]:[&_[class~='group/avatar-settings-preview']]:p-[6px] [@media(width<=640px)]:[&_[class~='group/avatar-settings-preview']]:rounded-[15px] [@media(width<=640px)]:[&_[class~='group/avatar-settings-preview']]:row-[1_/_4] [&_[class~='group/avatar-wardrobe']]:mt-[0] [&_[class~='group/avatar-reward-option']]:py-[12px] [&_[class~='group/avatar-reward-option']]:rounded-[10px] [&_[class~='group/avatar-reward-option']_strong]:[font-size:11px] [@media(width<=640px)]:[&_[class~='group/avatar-settings-preview']_>_svg]:w-[76px] [@media(width<=640px)]:[&_[class~='group/avatar-settings-preview']_>_svg]:h-[76px] motion-reduce:[&[data-slot='dialog-content']]:[animation:none]",
        )}
        showCloseButton={false}
        aria-busy={busy}
      >
        <DialogHeader
          className={cn(
            "avatar-dialog-heading relative pt-[26px] pr-[60px] pb-[22px] pl-[28px] shrink-[0] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eaf3] [@media(width<=640px)]:pt-[20px] [@media(width<=640px)]:pr-[48px] [@media(width<=640px)]:pb-[16px] [@media(width<=640px)]:pl-[20px] [&_[data-slot='dialog-title']]:[font-size:23px] [&_[data-slot='dialog-title']]:font-[700] [&_[data-slot='dialog-title']]:leading-[1.25] [&_[data-slot='dialog-title']]:tracking-[-0.7px] [@media(width<=640px)]:[&_[data-slot='dialog-title']]:[font-size:20px] [&_[data-slot='dialog-description']]:[font-size:12px] [&_[data-slot='dialog-description']]:leading-[1.7] [&_[data-slot='dialog-description']]:text-[color:#77869c] [&_[data-slot='dialog-description']]:mt-[4px]",
          )}
        >
          <DialogTitle>Un avatar à votre façon.</DialogTitle>
          <DialogDescription>
            Un motif, quelques détails, et votre touche personnelle.
          </DialogDescription>
          <DialogClose
            render={<Button variant="ghost" size="icon" disabled={busy} />}
            className={cn(
              "avatar-dialog-close absolute top-[22px] right-[20px] rounded-[8px] [@media(width<=640px)]:top-[16px] [@media(width<=640px)]:right-[12px]",
            )}
            aria-label="Fermer la personnalisation"
          >
            <X size={18} />
          </DialogClose>
        </DialogHeader>
        <div
          className={cn(
            "avatar-dialog-body overflow-hidden grid grid-cols-[245px_minmax(0,_1fr)] min-h-[0] [@media(width<=640px)]:block [@media(width<=640px)]:overflow-y-auto [@media(width<=640px)]:[overscroll-behavior:contain]",
          )}
        >
          <div
            className={cn(
              "avatar-dialog-preview-panel px-[20px] py-[38px] gap-[16px] flex flex-col items-center text-center bg-[#f1f5fc] [@media(width<=640px)]:py-[20px] [@media(width<=640px)]:grid [@media(width<=640px)]:text-left [@media(width<=640px)]:gap-y-[8px] [@media(width<=640px)]:grid-cols-[90px_minmax(0,_1fr)] [&_h3]:m-[0] [&_h3]:[font-size:13px] [&_h3]:font-[600] [@media(width<=640px)]:[&_h3]:[font-size:12px] [&_p]:m-[0] [&_p]:[font-size:12px] [&_p]:leading-[1.7] [&_p]:text-[color:#74849d] [@media(width<=640px)]:[&_p]:[font-size:11px] [&&_>_button]:px-[13px] [&&_>_button]:gap-[8px] [&&_>_button]:rounded-[8px] [&&_>_button]:min-h-[38px] [&&_>_button]:bg-[#fff] [@media(width<=640px)]:[&&_>_button]:px-[8px] [@media(width<=640px)]:[&&_>_button]:min-h-[34px] [@media(width<=640px)]:[&&_>_button]:[justify-self:start] [@media(width<=640px)]:[&&_>_button]:[font-size:11px] [&_[class~='group/avatar-dialog-preview-note']]:[font-size:10px] [@media(width<=640px)]:[&_[class~='group/avatar-dialog-preview-note']]:col-[1_/_-1] [@media(width<=640px)]:[&_[class~='group/avatar-dialog-preview-note']]:text-center",
            )}
          >
            <div
              className={cn(
                "avatar-settings-preview group/avatar-settings-preview",
              )}
            >
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
            <p
              className={cn(
                "avatar-dialog-preview-note group/avatar-dialog-preview-note",
              )}
            >
              Vos accessoires restent en place quand vous changez de motif.
            </p>
            <span className="sr-only" role="status">
              {message}
            </span>
          </div>
          <div
            className={cn(
              "avatar-dialog-options p-[24px] min-w-[0] overflow-y-auto [overscroll-behavior:contain] [scrollbar-gutter:stable] [@media(width<=640px)]:p-[20px] [@media(width<=640px)]:overflow-visible",
            )}
          >
            <div
              className={cn(
                "avatar-wardrobe group/avatar-wardrobe gap-[24px] mt-[26px] grid [&_fieldset]:p-[0] [&_fieldset]:m-[0] [&_fieldset]:border-[length:0] [&_fieldset]:border-none [&_fieldset]:border-[color:currentColor] [&_fieldset]:min-w-[0] [&_legend]:w-[100%] [&_legend]:mb-[12px] [&_legend]:[font-size:14px] [&_legend]:font-[600] [&_legend]:text-[color:#243753] [&_legend_span]:block [&_legend_span]:mt-[3px] [&_legend_span]:[font-size:12px] [&_legend_span]:font-[400] [&_legend_span]:text-[color:#697b94]",
              )}
              aria-busy={rewards === undefined}
            >
              <fieldset disabled={busy || !rewards}>
                <legend>
                  Couronnes <span>Vos places sur le podium</span>
                </legend>
                <div
                  className={cn(
                    "avatar-reward-options avatar-crown-options gap-[8px] grid grid-cols-[repeat(4,_minmax(0,_1fr))] [@media(width<=640px)]:grid-cols-[repeat(2,_minmax(0,_1fr))]",
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "avatar-reward-option group/avatar-reward-option px-[7px] py-[14px] gap-[8px] border-[length:1px] border-solid border-[color:#e0e7f1] w-[100%] h-[100%] flex flex-col items-center rounded-[12px] bg-[#fff] text-[color:#344760] text-center cursor-[pointer] [transition:border-color_150ms,_background_150ms] [&:not(:disabled):hover]:border-[color:#8eadee] [&:not(:disabled):hover]:bg-[#f7f9ff] [&[aria-pressed='true']]:border-[color:#356ae6] [&[aria-pressed='true']]:[box-shadow:inset_0_0_0_1px_#356ae6] [&[aria-pressed='true']]:bg-[#f2f6ff] [&:focus-visible]:[outline:3px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px] [&:disabled]:opacity-[1] [&:disabled]:cursor-[not-allowed] [&:disabled]:bg-[#f7f8fa] [&:disabled_[class~='group/brick-avatar']]:opacity-[0.55] [&_strong]:[font-size:12px] [&_strong]:font-[600] [&_strong]:leading-[1.4] [&_small]:[font-size:10px] [&_small]:leading-[1.5] [&_small]:text-[color:#65758e] [&_progress]:border-[length:0] [&_progress]:border-none [&_progress]:border-[color:currentColor] [&_progress]:w-[75%] [&_progress]:h-[4px] [&_progress]:[accent-color:#356ae6]",
                    )}
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
                      <div
                        key={crown.id}
                        className={cn(
                          "avatar-reward-item min-w-[0] flex flex-col",
                        )}
                      >
                        <button
                          type="button"
                          className={cn(
                            "avatar-reward-option group/avatar-reward-option px-[7px] py-[14px] gap-[8px] border-[length:1px] border-solid border-[color:#e0e7f1] w-[100%] h-[100%] flex flex-col items-center rounded-[12px] bg-[#fff] text-[color:#344760] text-center cursor-[pointer] [transition:border-color_150ms,_background_150ms] [&:not(:disabled):hover]:border-[color:#8eadee] [&:not(:disabled):hover]:bg-[#f7f9ff] [&[aria-pressed='true']]:border-[color:#356ae6] [&[aria-pressed='true']]:[box-shadow:inset_0_0_0_1px_#356ae6] [&[aria-pressed='true']]:bg-[#f2f6ff] [&:focus-visible]:[outline:3px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px] [&:disabled]:opacity-[1] [&:disabled]:cursor-[not-allowed] [&:disabled]:bg-[#f7f8fa] [&:disabled_[class~='group/brick-avatar']]:opacity-[0.55] [&_strong]:[font-size:12px] [&_strong]:font-[600] [&_strong]:leading-[1.4] [&_small]:[font-size:10px] [&_small]:leading-[1.5] [&_small]:text-[color:#65758e] [&_progress]:border-[length:0] [&_progress]:border-none [&_progress]:border-[color:currentColor] [&_progress]:w-[75%] [&_progress]:h-[4px] [&_progress]:[accent-color:#356ae6]",
                          )}
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
                            className={cn(
                              "avatar-reward-source pt-[7px] text-center text-[color:#356ae6] [font-size:10px] [&:hover]:[text-decoration:underline]",
                            )}
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
                <div
                  className={cn(
                    "avatar-reward-options avatar-ring-options gap-[8px] grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=640px)]:grid-cols-[repeat(2,_minmax(0,_1fr))]",
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "avatar-reward-option group/avatar-reward-option px-[7px] py-[14px] gap-[8px] border-[length:1px] border-solid border-[color:#e0e7f1] w-[100%] h-[100%] flex flex-col items-center rounded-[12px] bg-[#fff] text-[color:#344760] text-center cursor-[pointer] [transition:border-color_150ms,_background_150ms] [&:not(:disabled):hover]:border-[color:#8eadee] [&:not(:disabled):hover]:bg-[#f7f9ff] [&[aria-pressed='true']]:border-[color:#356ae6] [&[aria-pressed='true']]:[box-shadow:inset_0_0_0_1px_#356ae6] [&[aria-pressed='true']]:bg-[#f2f6ff] [&:focus-visible]:[outline:3px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px] [&:disabled]:opacity-[1] [&:disabled]:cursor-[not-allowed] [&:disabled]:bg-[#f7f8fa] [&:disabled_[class~='group/brick-avatar']]:opacity-[0.55] [&_strong]:[font-size:12px] [&_strong]:font-[600] [&_strong]:leading-[1.4] [&_small]:[font-size:10px] [&_small]:leading-[1.5] [&_small]:text-[color:#65758e] [&_progress]:border-[length:0] [&_progress]:border-none [&_progress]:border-[color:currentColor] [&_progress]:w-[75%] [&_progress]:h-[4px] [&_progress]:[accent-color:#356ae6]",
                    )}
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
                        className={cn(
                          "avatar-reward-option group/avatar-reward-option px-[7px] py-[14px] gap-[8px] border-[length:1px] border-solid border-[color:#e0e7f1] w-[100%] h-[100%] flex flex-col items-center rounded-[12px] bg-[#fff] text-[color:#344760] text-center cursor-[pointer] [transition:border-color_150ms,_background_150ms] [&:not(:disabled):hover]:border-[color:#8eadee] [&:not(:disabled):hover]:bg-[#f7f9ff] [&[aria-pressed='true']]:border-[color:#356ae6] [&[aria-pressed='true']]:[box-shadow:inset_0_0_0_1px_#356ae6] [&[aria-pressed='true']]:bg-[#f2f6ff] [&:focus-visible]:[outline:3px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px] [&:disabled]:opacity-[1] [&:disabled]:cursor-[not-allowed] [&:disabled]:bg-[#f7f8fa] [&:disabled_[class~='group/brick-avatar']]:opacity-[0.55] [&_strong]:[font-size:12px] [&_strong]:font-[600] [&_strong]:leading-[1.4] [&_small]:[font-size:10px] [&_small]:leading-[1.5] [&_small]:text-[color:#65758e] [&_progress]:border-[length:0] [&_progress]:border-none [&_progress]:border-[color:currentColor] [&_progress]:w-[75%] [&_progress]:h-[4px] [&_progress]:[accent-color:#356ae6]",
                        )}
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
              <p
                className={cn(
                  "avatar-reward-note m-[0] [font-size:12px] text-[color:#697b94] leading-[1.6]",
                )}
              >
                Les récompenses restent à vous. Associez une couronne et un
                contour, ou gardez votre avatar tel quel.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter
          className={cn(
            "avatar-dialog-footer [&[data-slot='dialog-footer']]:px-[24px] [&[data-slot='dialog-footer']]:py-[16px] [&[data-slot='dialog-footer']]:gap-[16px] [&[data-slot='dialog-footer']]:shrink-[0] [&[data-slot='dialog-footer']]:flex [&[data-slot='dialog-footer']]:items-center [&[data-slot='dialog-footer']]:flex-row [&[data-slot='dialog-footer']]:justify-between [&[data-slot='dialog-footer']]:[border-top-width:1px] [&[data-slot='dialog-footer']]:[border-top-style:solid] [&[data-slot='dialog-footer']]:[border-top-color:#e4eaf3] [&[data-slot='dialog-footer']]:bg-[#fafbfd] [@media(width<=640px)]:[&[data-slot='dialog-footer']]:px-[16px] [@media(width<=640px)]:[&[data-slot='dialog-footer']]:py-[12px] [@media(width<=640px)]:[&[data-slot='dialog-footer']]:gap-[10px] [@media(width<=640px)]:[&[data-slot='dialog-footer']]:items-stretch [@media(width<=640px)]:[&[data-slot='dialog-footer']]:flex-col",
          )}
        >
          <div
            className={cn(
              "avatar-dialog-feedback max-w-[340px] [font-size:11px] leading-[1.6] text-[color:#77869c] [@media(width<=640px)]:max-w-[none] [@media(width<=640px)]:[font-size:10px] [&_[role='alert']]:text-[color:#b4473d]",
            )}
          >
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
          <div
            className={cn(
              "avatar-dialog-actions gap-[8px] flex shrink-[0] [@media(width<=640px)]:justify-end [&_button]:px-[15px] [&_button]:rounded-[8px] [&_button]:min-h-[40px] [@media(width<=640px)]:[&_button]:px-[11px] [@media(width<=640px)]:[&_button]:[font-size:11px]",
            )}
          >
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
