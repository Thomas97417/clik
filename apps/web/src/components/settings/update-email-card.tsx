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
            toast.success("Email updated successfully.");
          },
          onError: (error) => {
            toast.error(error.error.message);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        newEmail: z.string().email("Invalid email address"),
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
            title="Email Address"
            description="The email address associated with your account."
          />
          <form.Field
            name="newEmail"
            children={(field) => (
              <div className="flex flex-col gap-1">
                <Label htmlFor="newEmail">Email</Label>
                <Input
                  id="newEmail"
                  autoComplete="off"
                  required
                  disabled={isSocialOnly}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-80 bg-transparent"
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
              ? "Email is managed by your social login provider."
              : "Please enter a valid email address."}
          </p>
          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                size="sm"
                disabled={
                  isSocialOnly || !state.canSubmit || state.isSubmitting
                }
              >
                {state.isSubmitting ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  "Save"
                )}
              </Button>
            )}
          </form.Subscribe>
        </SettingsCardFooter>
      </SettingsCard>
    </form>
  );
}
