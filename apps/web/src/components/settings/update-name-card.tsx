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
      className="min-w-0 h-full"
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
                <Label
                  className="text-xs text-[#445771] mb-1.25 leading-none"
                  htmlFor="name"
                >
                  Nom public
                </Label>
                <Input
                  placeholder="Votre nom"
                  id="name"
                  autoComplete="name"
                  maxLength={32}
                  required
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full bg-transparent px-3 border border-solid border-[#dce4ef] min-w-0 min-h-10.5 rounded-[8px] text-[13px] [box-shadow:none] focus-visible:border-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae626] focus-visible:outline-offset-2 leading-(--text-xs--line-height) focus-visible:shadow-none aria-invalid:shadow-none focus-visible:ring-0 aria-invalid:ring-0"
                />
                {field.state.meta.errors.map((error) => (
                  <p
                    key={error?.message}
                    className="text-sm leading-(--text-sm--line-height) text-destructive"
                  >
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          />
        </SettingsCardContent>
        <SettingsCardFooter>
          <p className="text-[11px] text-[#7c899d] leading-[1.6]">
            Entre 2 et 32 caractères.
          </p>
          <form.Subscribe>
            {(state) => (
              <Button
                className="px-3 min-h-9 rounded-[7px] text-[11px] whitespace-normal leading-(--text-xs--line-height)"
                type="submit"
                size="sm"
                disabled={
                  !state.isDirty || !state.canSubmit || state.isSubmitting
                }
              >
                {state.isSubmitting ? (
                  <>
                    <Loader2
                      className="size-3.5 pointer-events-none shrink-0 animate-spin"
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
