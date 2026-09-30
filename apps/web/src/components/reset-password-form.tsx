import { useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import {
  authErrorMessage,
  newPasswordSchema,
  passwordHint,
} from "@/lib/auth-form";
import AuthLayout from "./auth/auth-layout";
import {
  AuthError,
  AuthField,
  AuthSubmit,
  useAuthForm,
} from "./auth/form-controls";

const schema = z
  .object({ newPassword: newPasswordSchema, confirmPassword: z.string() })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Les deux mots de passe doivent être identiques.",
    path: ["confirmPassword"],
  });
export default function ResetPasswordForm() {
  const search = useSearch({ strict: false }) as {
    token?: unknown;
    error?: unknown;
  };
  const token = typeof search.token === "string" ? search.token : "";
  const [done, setDone] = useState(false);
  const [expired, setExpired] = useState(false);
  const form = useAuthForm(
    { newPassword: "", confirmPassword: "" },
    schema,
    async (value) => {
      const { error } = await authClient.resetPassword({
        newPassword: value.newPassword,
        token,
      });
      if (error) {
        if (["INVALID_TOKEN", "TOKEN_EXPIRED"].includes(error.code ?? ""))
          setExpired(true);
        throw new Error(
          authErrorMessage(
            error,
            "Impossible de modifier le mot de passe. Réessayez.",
          ),
        );
      }
      setDone(true);
    },
  );
  if (!token || search.error || expired)
    return (
      <AuthLayout
        title="Ce lien n’est plus valide"
        description="Le lien est incomplet ou a expiré. Demandez-en un nouveau pour retrouver votre atelier."
      >
        <Link className="auth-submit" to="/forgot-password">
          Demander un nouveau lien
        </Link>
        <p className="auth-switch">
          <Link to="/sign-in">Retour à la connexion</Link>
        </p>
      </AuthLayout>
    );
  if (done)
    return (
      <AuthLayout
        title="Mot de passe modifié"
        description="Vous pouvez maintenant vous connecter avec votre nouveau mot de passe."
      >
        <div className="auth-confirmation" role="status">
          Votre nouveau mot de passe a bien été enregistré.
        </div>
        <Link className="auth-submit" to="/sign-in">
          Se connecter
        </Link>
      </AuthLayout>
    );
  return (
    <AuthLayout
      title="Un nouveau mot de passe"
      description="Choisissez un mot de passe, puis saisissez-le une seconde fois pour le confirmer."
    >
      <form
        className="auth-form"
        noValidate
        onSubmit={form.submit}
        aria-busy={form.busy}
      >
        <fieldset disabled={form.busy}>
          <AuthField
            id="newPassword"
            label="Nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            placeholder="Choisissez un mot de passe"
            required
            hint={passwordHint}
            value={form.values.newPassword}
            onChange={(e) => form.change("newPassword", e.target.value)}
            error={form.errors.newPassword}
          />
          <AuthField
            id="confirmPassword"
            label="Confirmer le mot de passe"
            type="password"
            autoComplete="new-password"
            placeholder="Saisissez-le à nouveau"
            required
            value={form.values.confirmPassword}
            onChange={(e) => form.change("confirmPassword", e.target.value)}
            error={form.errors.confirmPassword}
          />
        </fieldset>
        <AuthError>{form.error}</AuthError>
        <AuthSubmit busy={form.busy} pending="Enregistrement…">
          Enregistrer le mot de passe
        </AuthSubmit>
      </form>
      <p className="auth-switch">
        <Link to="/sign-in">Retour à la connexion</Link>
      </p>
    </AuthLayout>
  );
}
