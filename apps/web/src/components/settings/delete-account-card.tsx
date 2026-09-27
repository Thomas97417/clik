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
    <SettingsCard className="border-destructive">
      <SettingsCardContent>
        <SettingsCardHeader
          title="Delete Account"
          description="Permanently delete your account and all associated data. This action cannot be undone."
        />
      </SettingsCardContent>
      <SettingsCardFooter className="bg-destructive/10 dark:bg-destructive/10">
        <p className="text-sm text-muted-foreground">Proceed with caution.</p>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                size="sm"
                variant="destructive"
                className="hover:cursor-pointer"
              />
            }
          >
            Delete Account
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <TriangleAlert className="size-5" />
              </AlertDialogMedia>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is permanent and cannot be undone. All your data
                will be deleted immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleDelete}>
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingsCardFooter>
    </SettingsCard>
  );
}
