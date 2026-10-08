import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
} from "./settings-card";
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

export default function DeleteAccountCard() {
  const navigate = useNavigate();

  const handleDelete = async () => {
    await authClient.deleteUser({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: "/" });
          location.reload();
        },
        onError: (error) => {
          toast.error(error.error.message);
        },
      },
    });
  };

  return (
    <SettingsCard className="settings-danger-card h-auto">
      <SettingsCardContent>
        <SettingsCardHeader
          title="Supprimer mon compte"
          description="Vous souhaitez quitter Clik ? La suppression de votre compte est définitive."
        />
      </SettingsCardContent>
      <SettingsCardFooter className="settings-danger-footer border-[#f1e5e0] flex-row items-center justify-between bg-[#fffaf8] [@media(width<=640px)]:flex-col [@media(width<=640px)]:items-start">
        <p className="text-[11px] text-[#7c899d] leading-[1.6]">
          Cette action est irréversible.
        </p>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                size="sm"
                variant="destructive"
                className="hover:cursor-pointer shrink-0 px-3 min-h-9 rounded-[7px] text-[11px] whitespace-normal leading-(--text-xs--line-height)"
              />
            }
          >
            Supprimer mon compte
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <TriangleAlert className="size-5" />
              </AlertDialogMedia>
              <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous ne pourrez plus vous connecter à ce compte. Cette action
                est définitive.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="shrink-0">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                className="shrink-0"
                variant="destructive"
                onClick={handleDelete}
              >
                Supprimer mon compte
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingsCardFooter>
    </SettingsCard>
  );
}
