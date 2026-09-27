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
        toast.success("Password changed successfully.");
        form.reset();
      }
    },
    validators: {
      onSubmit: z
        .object({
          currentPassword: z.string().min(1, "Current password is required."),
          newPassword: z
            .string()
            .min(8, "New password must be at least 8 characters."),
          confirmPassword: z.string(),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: "Passwords do not match.",
          path: ["confirmPassword"],
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
            title="Password"
            description="Change the password associated with your account."
          />
          <div className="flex flex-col gap-3">
            <form.Field
              name="currentPassword"
              children={(field) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <PasswordInput
                    id="currentPassword"
                    placeholder="Current password"
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      key={error?.message}
                      className="text-sm text-destructive"
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
                  <Label htmlFor="newPassword">New password</Label>
                  <PasswordInput
                    id="newPassword"
                    placeholder="New password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      key={error?.message}
                      className="text-sm text-destructive"
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
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      key={error?.message}
                      className="text-sm text-destructive"
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
          <p className="text-sm text-muted-foreground">
            Password must be at least 8 characters.
          </p>
          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                size="sm"
                disabled={!state.canSubmit || state.isSubmitting}
              >
                {state.isSubmitting ? "Saving..." : "Save"}
              </Button>
            )}
          </form.Subscribe>
        </SettingsCardFooter>
      </SettingsCard>
    </form>
  );
}
