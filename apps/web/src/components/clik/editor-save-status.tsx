import {
  AlertCircle,
  CloudAlert,
  CloudCheck,
  HardDrive,
  LoaderCircle,
  WifiOff,
} from "lucide-react";
import type {
  LocalSaveStatus,
  ProjectSyncStatus,
} from "@/lib/clik/use-project";
import { cn } from "@/lib/utils";

const syncLabels: Record<ProjectSyncStatus, string> = {
  local: "",
  loading: "Connexion au projet…",
  syncing: "Synchronisation en cours…",
  synced: "Synchronisé en ligne",
  offline: "Hors ligne · en attente",
  error: "Synchronisation impossible",
};

export default function EditorSaveStatus({
  localStatus,
  syncStatus,
  conflict,
}: {
  localStatus: LocalSaveStatus;
  syncStatus: ProjectSyncStatus;
  conflict: boolean;
}) {
  const label = conflict
    ? "Conflit à résoudre"
    : localStatus === "error"
      ? "Sauvegarde locale indisponible"
      : localStatus === "loading"
        ? "Chargement du projet…"
        : localStatus === "saved"
          ? "Enregistré sur cet appareil"
          : "Enregistrement sur cet appareil…";
  const LocalIcon =
    conflict || localStatus === "error"
      ? AlertCircle
      : localStatus === "loading" || localStatus === "saving"
        ? LoaderCircle
        : HardDrive;
  const SyncIcon = conflict
    ? AlertCircle
    : syncStatus === "offline"
      ? WifiOff
      : syncStatus === "error"
        ? CloudAlert
        : syncStatus === "synced"
          ? CloudCheck
          : LoaderCircle;
  const syncLabel = conflict
    ? "Synchronisation suspendue"
    : syncLabels[syncStatus];

  return (
    <div
      className="save-status flex h-8 w-52 shrink-0 flex-col justify-center gap-0.5 text-[11px] leading-4 text-[#68788e]"
      data-state={conflict ? "conflict" : localStatus}
      data-sync-state={syncStatus}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-1.5",
          conflict && "text-[#9b660c]",
          !conflict && localStatus === "error" && "text-[#c33e42]",
        )}
        title={label}
      >
        <LocalIcon
          size={14}
          aria-hidden="true"
          className={cn(
            "shrink-0",
            !conflict && localStatus === "saved" && "text-[#34906c]",
            !conflict &&
              (localStatus === "saving" || localStatus === "loading") &&
              "animate-spin text-[#356ae6] motion-reduce:animate-none",
          )}
        />
        <span className="truncate">{label}</span>
      </div>
      {syncStatus !== "local" && (
        <div
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-[10px] leading-3 text-[#8a97ab]",
            (conflict || syncStatus === "offline") && "text-[#9b660c]",
            !conflict && syncStatus === "error" && "text-[#c33e42]",
          )}
          title={syncLabel}
        >
          <SyncIcon
            size={14}
            aria-hidden="true"
            className={cn(
              "shrink-0",
              !conflict &&
                (syncStatus === "syncing" || syncStatus === "loading") &&
                "animate-spin motion-reduce:animate-none",
            )}
          />
          <span className="truncate">{syncLabel}</span>
        </div>
      )}
    </div>
  );
}
