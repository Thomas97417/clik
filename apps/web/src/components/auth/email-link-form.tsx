import { cn } from "@/lib/utils";
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
          <div
            className={cn(
              "auth-confirmation p-[18px] border-[length:1px] border-solid border-[color:#cce8db] mb-[20px] rounded-[12px] bg-[#f1faf6] text-[color:#316e55] [font-size:13px] leading-[1.8] [overflow-wrap:anywhere] [&_strong]:block [&_strong]:mb-[7px] [&_strong]:font-[650]",
            )}
            role="status"
          >
            <strong>La demande a bien été prise en compte.</strong>
            <p>
              Si un compte est associé à <b>{sent}</b>, vous recevrez un lien de{" "}
              {reset ? "réinitialisation" : "vérification"}.
            </p>
          </div>
          <p
            className={cn(
              "auth-help mb-[24px] [font-size:12px] text-[color:#71819a] leading-[1.8]",
            )}
          >
            L’email peut prendre quelques minutes. Pensez aussi à vérifier vos
            courriers indésirables.
          </p>
          <Link
            className={cn(
              "auth-submit group/auth-submit px-[16px] py-[12px] gap-[10px] border-[length:1px] border-solid border-[color:#356ae6] flex items-center justify-center w-[100%] min-h-[46px] rounded-[10px] text-[color:#fff] bg-[#356ae6] [font-size:13px] leading-[1.5] font-[650] text-center [&:hover:not(:disabled)]:border-[color:#2458ce] [&:hover:not(:disabled)]:bg-[#2458ce] [&:disabled]:opacity-[0.65]",
            )}
            to="/sign-in"
          >
            Retour à la connexion
          </Link>
          <button
            className={cn(
              "auth-secondary-link mx-[auto] block mt-[15px] mb-[0] w-[fit-content] text-[color:#71809a] [font-size:11px] text-center [&:hover]:text-[color:#2458ce] [&:hover]:[text-decoration:underline] [&:hover]:underline-offset-[3px]",
            )}
            type="button"
            onClick={() => setSent("")}
          >
            Corriger l’adresse email
          </button>
        </>
      ) : (
        <>
          <form
            className={cn(
              "auth-form gap-[19px] grid min-w-[0] [&_fieldset]:p-[0] [&_fieldset]:m-[0] [&_fieldset]:gap-[19px] [&_fieldset]:border-[length:0] [&_fieldset]:border-none [&_fieldset]:border-[color:currentColor] [&_fieldset]:grid [&_fieldset]:min-w-[0]",
            )}
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
          <p
            className={cn(
              "auth-switch pt-[23px] mt-[23px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e9edf4] text-center [font-size:12px] text-[color:#7b899e] leading-[1.7] [&_a]:gap-[6px] [&_a]:inline-flex [&_a]:items-center [&_a]:text-[color:#356ae6] [&_a]:font-[650]",
            )}
          >
            <Link to="/sign-in">
              <ArrowLeft size={15} aria-hidden="true" /> Retour à la connexion
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
