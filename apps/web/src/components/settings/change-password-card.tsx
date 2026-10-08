import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
} from "./settings-card";

import PasswordInput from "../ui/password-input";

export default function ChangePasswordCard() {
  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Mot de passe modifié.");
        form.reset();
      }
    },
    validators: {
      onSubmit: z
        .object({
          currentPassword: z
            .string()
            .min(1, "Saisissez votre mot de passe actuel."),
          newPassword: z.string().min(8, "Utilisez au moins 8 caractères."),
          confirmPassword: z.string(),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: "Les mots de passe ne correspondent pas.",
          path: ["confirmPassword"],
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
            title="Mot de passe"
            description="Choisissez une combinaison unique pour protéger vos créations."
          />
          <div className="flex flex-col gap-3">
            <form.Field
              name="currentPassword"
              children={(field) => (
                <div className="flex flex-col gap-1">
                  <Label
                    className="text-xs text-[#445771] mb-1.25 leading-none"
                    htmlFor="currentPassword"
                  >
                    Mot de passe actuel
                  </Label>
                  <PasswordInput
                    className="px-3 border border-solid border-[#dce4ef] w-full min-w-0 min-h-10.5 rounded-[8px] text-[13px] [box-shadow:none] focus-visible:border-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae626] focus-visible:outline-offset-2 pr-10 leading-(--text-xs--line-height) focus-visible:shadow-none aria-invalid:shadow-none focus-visible:ring-0 aria-invalid:ring-0"
                    id="currentPassword"
                    placeholder="Mot de passe actuel"
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
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
            <form.Field
              name="newPassword"
              children={(field) => (
                <div className="flex flex-col gap-1">
                  <Label
                    className="text-xs text-[#445771] mb-1.25 leading-none"
                    htmlFor="newPassword"
                  >
                    Nouveau mot de passe
                  </Label>
                  <PasswordInput
                    className="px-3 border border-solid border-[#dce4ef] w-full min-w-0 min-h-10.5 rounded-[8px] text-[13px] [box-shadow:none] focus-visible:border-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae626] focus-visible:outline-offset-2 pr-10 leading-(--text-xs--line-height) focus-visible:shadow-none aria-invalid:shadow-none focus-visible:ring-0 aria-invalid:ring-0"
                    id="newPassword"
                    placeholder="Nouveau mot de passe"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
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
            <form.Field
              name="confirmPassword"
              children={(field) => (
                <div className="flex flex-col gap-1">
                  <Label
                    className="text-xs text-[#445771] mb-1.25 leading-none"
                    htmlFor="confirmPassword"
                  >
                    Confirmez le nouveau mot de passe
                  </Label>
                  <PasswordInput
                    className="px-3 border border-solid border-[#dce4ef] w-full min-w-0 min-h-10.5 rounded-[8px] text-[13px] [box-shadow:none] focus-visible:border-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae626] focus-visible:outline-offset-2 pr-10 leading-(--text-xs--line-height) focus-visible:shadow-none aria-invalid:shadow-none focus-visible:ring-0 aria-invalid:ring-0"
                    id="confirmPassword"
                    placeholder="Confirmez le nouveau mot de passe"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
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
          </div>
        </SettingsCardContent>
        <SettingsCardFooter>
          <p className="text-[11px] text-[#7c899d] leading-[1.6]">
            8 caractères minimum. Les autres appareils seront déconnectés.
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
                {state.isSubmitting
                  ? "Enregistrement…"
                  : "Modifier le mot de passe"}
              </Button>
            )}
          </form.Subscribe>
        </SettingsCardFooter>
      </SettingsCard>
    </form>
  );
}
