import { authClient } from "@/lib/auth-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Loader2, Monitor, Smartphone, Globe, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
} from "./settings-card";
import { Skeleton } from "../ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";

export default function SessionsCard() {
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const router = useRouter();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data } = await authClient.listSessions();
      return data;
    },
  });

  const { data: currentSession } = useQuery({
    queryKey: ["current-session"],
    queryFn: async () => {
      const { data } = await authClient.getSession();
      return data;
    },
  });

  const currentSessionId = currentSession?.session?.id;

  async function revokeSession(sessionId: string, sessionToken: string) {
    const isCurrent = sessionId === currentSessionId;
    setRevokingId(sessionToken);
    await authClient.revokeSession(
      { token: sessionToken },
      {
        onSuccess: () => {
          if (isCurrent) {
            router.navigate({ to: "/" });
            return;
          }
          toast.success("Appareil déconnecté.");
          queryClient.invalidateQueries({ queryKey: ["sessions"] });
        },
        onError: (error) => {
          toast.error(error.error.message);
        },
      },
    );
    setRevokingId(null);
  }

  async function revokeOtherSessions() {
    setRevokingAll(true);
    const { error } = await authClient.revokeOtherSessions();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Les autres appareils ont été déconnectés.");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    }
    setRevokingAll(false);
  }

  function getDeviceIcon(userAgent: string | null | undefined) {
    if (!userAgent) return <Globe className="size-4" />;
    const ua = userAgent.toLowerCase();
    if (
      ua.includes("mobile") ||
      ua.includes("android") ||
      ua.includes("iphone")
    ) {
      return <Smartphone className="size-4" />;
    }
    return <Monitor className="size-4" />;
  }

  function getBrowserName(userAgent: string | null | undefined) {
    if (!userAgent) return "Navigateur inconnu";
    const ua = userAgent.toLowerCase();
    if (ua.includes("firefox")) return "Firefox";
    if (ua.includes("edg")) return "Edge";
    if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
    if (ua.includes("chrome")) return "Chrome";
    if (ua.includes("opera") || ua.includes("opr")) return "Opera";
    return "Navigateur inconnu";
  }

  const otherSessions = sessions?.filter((s) => s.id !== currentSessionId);

  return (
    <SettingsCard>
      <SettingsCardContent>
        <SettingsCardHeader
          title="Appareils connectés"
          description="Retrouvez les navigateurs qui ont accès à votre atelier."
        />
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : sessions?.length ? (
            sessions.map((session) => {
              const isCurrent = session.id === currentSessionId;
              return (
                <div
                  key={session.token}
                  className="settings-session p-3 gap-2 border border-solid border-[#e1e7f0] flex items-center justify-between rounded-[9px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-muted-foreground min-w-0">
                      {getDeviceIcon(session.userAgent)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 text-sm leading-(--text-sm--line-height)">
                        <span className="wrap-anywhere">
                          {getBrowserName(session.userAgent)}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium text-primary wrap-anywhere">
                            Cet appareil
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground group/text-xs wrap-anywhere text-[10px] leading-[1.6]">
                        Dernière activité :{" "}
                        {new Date(session.updatedAt).toLocaleDateString(
                          "fr-FR",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </div>
                  </div>
                  {isCurrent ? (
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="hover:cursor-pointer text-muted-foreground hover:text-destructive group/text-xs text-[10px] min-w-7.5 min-h-7.5 rounded-[6px] leading-(--text-xs--line-height) leading-[1.6]"
                            aria-label="Se déconnecter de cet appareil"
                            disabled={revokingId === session.token}
                          />
                        }
                      >
                        {revokingId === session.token ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <X className="size-3" />
                        )}
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogMedia>
                            <LogOut className="size-5" />
                          </AlertDialogMedia>
                          <AlertDialogTitle>
                            Déconnecter cet appareil ?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Vous serez déconnecté et redirigé vers la page
                            d’accueil.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="min-w-7.5 min-h-7.5 rounded-[6px]">
                            Annuler
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="min-w-7.5 min-h-7.5 rounded-[6px]"
                            variant="destructive"
                            onClick={() =>
                              revokeSession(session.id, session.token)
                            }
                          >
                            Se déconnecter
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="hover:cursor-pointer text-muted-foreground hover:text-destructive min-w-7.5 min-h-7.5 rounded-[6px]"
                      aria-label={`Déconnecter ${getBrowserName(session.userAgent)}`}
                      disabled={revokingId === session.token}
                      onClick={() => revokeSession(session.id, session.token)}
                    >
                      {revokingId === session.token ? (
                        <Loader2 className="pointer-events-none shrink-0 size-3 animate-spin" />
                      ) : (
                        <X className="pointer-events-none shrink-0 size-3" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm leading-(--text-sm--line-height) text-muted-foreground">
              Aucun appareil à afficher.
            </p>
          )}
        </div>
      </SettingsCardContent>
      <SettingsCardFooter>
        <p className="text-[11px] text-[#7c899d] leading-[1.6]">
          Un appareil inconnu ? Vous pouvez lui retirer l’accès.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="hover:cursor-pointer px-3 min-h-9 rounded-[7px] text-[11px] whitespace-normal leading-(--text-xs--line-height)"
          disabled={!otherSessions?.length || revokingAll}
          onClick={revokeOtherSessions}
        >
          {revokingAll ? (
            <Loader2 className="pointer-events-none shrink-0 size-4 animate-spin" />
          ) : (
            "Déconnecter les autres"
          )}
        </Button>
      </SettingsCardFooter>
    </SettingsCard>
  );
}
