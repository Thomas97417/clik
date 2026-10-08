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
            title="Votre adresse e-mail"
            description="Pour vous connecter et recevoir les messages liés à votre compte."
          />
          <form.Field
            name="newEmail"
            children={(field) => (
              <div className="flex flex-col gap-1">
                <Label
                  className="text-xs text-[#445771] mb-1.25 leading-none"
                  htmlFor="newEmail"
                >
                  Adresse e-mail
                </Label>
                <Input
                  id="newEmail"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isSocialOnly}
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
            {isSocialOnly
              ? "Cette adresse est gérée par votre connexion Google ou GitHub."
              : "Cette adresse reste privée."}
          </p>
          <form.Subscribe>
            {(state) => (
              <Button
                className="px-3 min-h-9 rounded-[7px] text-[11px] whitespace-normal leading-(--text-xs--line-height)"
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
                      className="pointer-events-none shrink-0 animate-spin size-4"
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
