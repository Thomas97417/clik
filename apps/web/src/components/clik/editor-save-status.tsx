import { Tooltip } from "@base-ui/react/tooltip";
import {
  AlertCircle,
  Cloud,
  CloudAlert,
  CloudCheck,
  CloudUpload,
  HardDrive,
  LoaderCircle,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type {
  LocalSaveStatus,
  ProjectSyncStatus,
} from "@/lib/clik/use-project";

type Indicator = { label: string; icon: LucideIcon; className: string };
const saving = "text-[#356ae6] motion-safe:animate-spin";
const syncing = "text-[#356ae6] motion-safe:animate-pulse";
const saved = "text-[#34906c]";
const warning = "text-[#9b660c]";
const error = "text-[#c33e42]";

const localStates: Record<LocalSaveStatus, Indicator> = {
  loading: {
    label: "Chargement du projet…",
    icon: LoaderCircle,
    className: saving,
  },
  saving: {
    label: "Enregistrement sur cet appareil…",
    icon: LoaderCircle,
    className: saving,
  },
  saved: {
    label: "Enregistré sur cet appareil",
    icon: HardDrive,
    className: saved,
  },
  error: {
    label: "Sauvegarde locale indisponible",
    icon: AlertCircle,
    className: error,
  },
};
const syncStates: Record<Exclude<ProjectSyncStatus, "local">, Indicator> = {
  loading: { label: "Connexion au projet…", icon: Cloud, className: syncing },
  syncing: {
    label: "Synchronisation en cours…",
    icon: CloudUpload,
    className: syncing,
  },
  synced: { label: "Synchronisé en ligne", icon: CloudCheck, className: saved },
  offline: {
    label: "Hors ligne · en attente",
    icon: WifiOff,
    className: warning,
  },
  error: {
    label: "Synchronisation impossible",
    icon: CloudAlert,
    className: error,
  },
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
  const local = conflict
    ? { label: "Conflit à résoudre", icon: AlertCircle, className: warning }
    : localStates[localStatus];
  const sync =
    syncStatus === "local"
      ? null
      : conflict
        ? {
            label: "Synchronisation suspendue",
            icon: CloudAlert,
            className: warning,
          }
        : syncStates[syncStatus];

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={<div />}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={0}
        className="save-status inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-1.5 hover:bg-[#f3f6fb] focus-visible:outline-2 focus-visible:outline-[#356ae6]"
        data-state={conflict ? "conflict" : localStatus}
        data-sync-state={syncStatus}
      >
        <local.icon size={16} aria-hidden="true" className={local.className} />
        {sync && (
          <sync.icon size={16} aria-hidden="true" className={sync.className} />
        )}
        <span className="sr-only">
          {local.label}
          {sync && `. ${sync.label}`}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="bottom" sideOffset={6} className="z-50">
          <Tooltip.Popup
            role="tooltip"
            className="rounded-md bg-[#253249] px-2.5 py-1.5 text-[11px] leading-4 text-white shadow-md"
          >
            {local.label}
            {sync && <div>{sync.label}</div>}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
