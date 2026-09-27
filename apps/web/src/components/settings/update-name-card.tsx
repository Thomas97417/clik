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
        { name: value.name },
        {
          onSuccess: () => {
            toast.success("Name updated successfully.");
          },
          onError: (error) => {
            toast.error(error.error.message);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Name must be at least 2 characters."),
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
            title="Your Name"
            description="This is the name displayed on your profile."
          />
          <form.Field
            name="name"
            children={(field) => (
              <div className="flex flex-col gap-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  placeholder="Name"
                  autoComplete="off"
                  required
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
            Please use 32 characters at maximum.
          </p>
          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                size="sm"
                disabled={!state.canSubmit || state.isSubmitting}
              >
                {state.isSubmitting ? (
                  <Loader2 className="animate-spin" />
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
