import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
} from "./settings-card";
import { Label } from "../ui/label";
import { Loader2 } from "lucide-react";

export default function UpdateNameCard({ name }: { name: string }) {
  const form = useForm({
    defaultValues: { name },
    onSubmit: async ({ value }) => {
      await authClient.updateUser(
        { name: value.name.trim() },
        {
          onSuccess: () => {
            toast.success("Nom mis à jour.");
            form.reset({ name: value.name.trim() });
          },
          onError: (error) => {
            toast.error(error.error.message);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        name: z
          .string()
          .trim()
          .min(2, "Votre nom doit contenir au moins 2 caractères.")
          .max(32, "32 caractères maximum."),
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
            title="Votre nom"
            description="Celui qui accompagne vos créations et vos commentaires."
          />
          <form.Field
            name="name"
            children={(field) => (
              <div className="flex flex-col gap-1">
                <Label htmlFor="name">Nom public</Label>
                <Input
                  placeholder="Votre nom"
                  id="name"
                  autoComplete="name"
                  maxLength={32}
                  required
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
            Entre 2 et 32 caractères.
          </p>
          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                size="sm"
                disabled={
                  !state.isDirty || !state.canSubmit || state.isSubmitting
                }
              >
                {state.isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />{" "}
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
