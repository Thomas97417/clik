import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await authClient.requestPasswordReset({
          email: value.email,
          redirectTo: "/reset-password",
        });
        setSent(true);
      } catch {
        toast.error("Une erreur est survenue. Réessayez.");
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Adresse email invalide"),
      }),
    },
  });

  if (sent) {
    return (
      <div className="mx-auto w-full mt-10 max-w-md p-6 text-center space-y-3">
        <h1 className="text-3xl font-bold">Consultez votre messagerie</h1>
        <p className="text-sm text-muted-foreground">
          Si un compte existe pour cette adresse, un lien de réinitialisation a
          été envoyé.
        </p>
        <Link
          to="/sign-in"
          className="inline-block text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      <h1 className="mb-2 text-center text-3xl font-bold">
        Mot de passe oublié ?
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Indiquez votre adresse email pour recevoir un lien de réinitialisation.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  placeholder="john.doe@example.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500 text-sm">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe>
          {(state) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? "Envoi…" : "Envoyer le lien"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Link
          to="/sign-in"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
