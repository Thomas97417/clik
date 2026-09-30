import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, emailSchema } from "@/lib/auth-form";
import AuthLayout from "./auth-layout";
import { AuthError, AuthField, AuthSubmit, useAuthForm } from "./form-controls";

const schema = z.object({ email: emailSchema });
export default function EmailLinkForm({
  purpose,
}: {
  purpose: "reset" | "verify";
}) {
  const reset = purpose === "reset";
  const [sent, setSent] = useState("");
  const form = useAuthForm({ email: "" }, schema, async (value) => {
    const { error } = reset
      ? await authClient.requestPasswordReset({
          email: value.email,
          redirectTo: "/reset-password",
        })
      : await authClient.sendVerificationEmail({
          email: value.email,
          callbackURL: "/sign-in",
        });
    if (error)
      throw new Error(
        authErrorMessage(
          error,
          "Le lien n’a pas pu être envoyé. Réessayez dans quelques instants.",
        ),
      );
    setSent(value.email);
  });
  return (
    <AuthLayout
      title={
        sent
          ? "Consultez votre messagerie"
          : reset
            ? "Mot de passe oublié ?"
            : "Vérifiez votre email"
      }
      description={
        sent
          ? "Suivez le lien reçu par email pour continuer."
          : reset
            ? "Ça arrive. Indiquez votre email pour choisir un nouveau mot de passe."
            : "Confirmez votre adresse pour accéder à votre compte. Nous vous envoyons un lien de vérification."
      }
    >
      {sent ? (
        <>
          <div className="auth-confirmation" role="status">
            <strong>La demande a bien été prise en compte.</strong>
            <p>
              Si un compte est associé à <b>{sent}</b>, vous recevrez un lien de{" "}
              {reset ? "réinitialisation" : "vérification"}.
            </p>
          </div>
          <p className="auth-help">
            L’email peut prendre quelques minutes. Pensez aussi à vérifier vos
            courriers indésirables.
          </p>
          <Link className="auth-submit" to="/sign-in">
            Retour à la connexion
          </Link>
          <button
            className="auth-secondary-link"
            type="button"
            onClick={() => setSent("")}
          >
            Corriger l’adresse email
          </button>
        </>
      ) : (
        <>
          <form
            className="auth-form"
            noValidate
            onSubmit={form.submit}
            aria-busy={form.busy}
          >
            <fieldset disabled={form.busy}>
              <AuthField
                id="email"
                label="Adresse email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.fr"
                required
                value={form.values.email}
                onChange={(e) => form.change("email", e.target.value)}
                error={form.errors.email}
              />
            </fieldset>
            <AuthError>{form.error}</AuthError>
            <AuthSubmit busy={form.busy}>
              Envoyer le lien{reset ? "" : " de vérification"}
            </AuthSubmit>
          </form>
          <p className="auth-switch">
            <Link to="/sign-in">
              <ArrowLeft size={15} aria-hidden="true" /> Retour à la connexion
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
