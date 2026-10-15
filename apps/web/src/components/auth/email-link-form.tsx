import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, MailCheck } from "lucide-react";
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
            className="auth-confirmation mb-5 rounded-[14px] border border-[#dfe7f4] bg-[#f6f8fc] p-4"
            role="status"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-[#dce6fb] bg-white text-[#356ae6]">
                <MailCheck size={17} aria-hidden="true" />
              </span>
              <strong className="text-[13px] leading-snug font-[650] text-[#34425b]">
                Demande prise en compte
              </strong>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed font-medium text-[#344d73] wrap-anywhere">
              {sent}
            </p>
            <p className="mt-1.5 text-xs leading-[1.75] text-[#647693]">
              Si un compte est associé à cette adresse, vous recevrez un lien de{" "}
              {reset ? "réinitialisation" : "vérification"}.
            </p>
          </div>
          <p className="auth-help mb-6 text-xs text-[#71819a] leading-[1.8]">
            L’email peut prendre quelques minutes. Pensez aussi à vérifier vos
            courriers indésirables.
          </p>
          <Link
            className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 auth-submit group/auth-submit px-4 py-3 gap-2.5 border border-solid border-[#356ae6] flex items-center justify-center w-full min-h-11.5 rounded-[10px] text-white bg-[#356ae6] text-[13px] leading-normal font-[650] text-center hover:enabled:border-[#2458ce] hover:enabled:bg-[#2458ce] disabled:opacity-65"
            to="/sign-in"
          >
            Retour à la connexion
          </Link>
          <button
            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 auth-secondary-link mx-auto block mt-3.75 mb-0 w-fit text-[#71809a] text-[11px] text-center hover:text-[#2458ce] hover:underline hover:underline-offset-3"
            type="button"
            onClick={() => setSent("")}
          >
            Corriger l’adresse email
          </button>
        </>
      ) : (
        <>
          <form
            className="auth-form gap-4.75 grid min-w-0"
            noValidate
            onSubmit={form.submit}
            aria-busy={form.busy}
          >
            <fieldset
              className="p-0 m-0 gap-4.75 border-0 border-none border-current grid min-w-0"
              disabled={form.busy}
            >
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
          <p className="auth-switch pt-5.75 mt-5.75 border-t border-solid border-t-[#e9edf4] text-center text-xs text-[#7b899e] leading-[1.7]">
            <Link
              className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 gap-1.5 inline-flex items-center text-[#356ae6] font-[650] hover:text-[#2458ce] hover:underline hover:underline-offset-3"
              to="/sign-in"
            >
              <ArrowLeft size={15} aria-hidden="true" /> Retour à la connexion
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
