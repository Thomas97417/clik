import { Input } from "@/components/ui/input";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
} from "./settings-card";
import { Label } from "../ui/label";
import { useForm } from "@tanstack/react-form";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import z from "zod";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function UpdateEmailCard({ email }: { email: string }) {
  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data } = await authClient.listAccounts();
      return data;
    },
  });
  const isSocialOnly =
    accounts !== undefined &&
    accounts !== null &&
    !accounts.some((account) => account.providerId === "credential");

  const form = useForm({
    defaultValues: { newEmail: email },
    onSubmit: async ({ value }) => {
      await authClient.changeEmail(
        { newEmail: value.newEmail },
        {
          onSuccess: () => {
            toast.success("Adresse e-mail mise à jour.");
            form.reset({ newEmail: value.newEmail });
          },
          onError: (error) => {
            toast.error(error.error.message);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        newEmail: z.string().email("Saisissez une adresse e-mail valide."),
      }),
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <SettingsCard>
        <SettingsCardContent>
          <SettingsCardHeader
            title="Votre adresse e-mail"
            description="Pour vous connecter et recevoir les messages liés à votre compte."
          />
          <form.Field
            name="newEmail"
            children={(field) => (
              <div className="flex flex-col gap-1">
                <Label htmlFor="newEmail">Adresse e-mail</Label>
                <Input
                  id="newEmail"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isSocialOnly}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full bg-transparent"
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-destructive">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          />
        </SettingsCardContent>
        <SettingsCardFooter>
          <p className="text-sm text-muted-foreground">
            {isSocialOnly
              ? "Cette adresse est gérée par votre connexion Google ou GitHub."
              : "Cette adresse reste privée."}
          </p>
          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                size="sm"
                disabled={
                  isSocialOnly ||
                  !state.isDirty ||
                  !state.canSubmit ||
                  state.isSubmitting
                }
              >
                {state.isSubmitting ? (
                  <>
                    <Loader2
                      className="animate-spin size-4"
                      aria-hidden="true"
                    />{" "}
                    Enregistrement…
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            )}
          </form.Subscribe>
        </SettingsCardFooter>
      </SettingsCard>
    </form>
  );
}
