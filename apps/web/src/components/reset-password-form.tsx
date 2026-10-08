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
        <Link
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 auth-submit group/auth-submit px-4 py-3 gap-2.5 border border-solid border-[#356ae6] flex items-center justify-center w-full min-h-11.5 rounded-[10px] text-white bg-[#356ae6] text-[13px] leading-normal font-[650] text-center hover:enabled:border-[#2458ce] hover:enabled:bg-[#2458ce] disabled:opacity-65"
          to="/forgot-password"
        >
          Demander un nouveau lien
        </Link>
        <p className="auth-switch pt-5.75 mt-5.75 border-t border-solid border-t-[#e9edf4] text-center text-xs text-[#7b899e] leading-[1.7]">
          <Link
            className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 gap-1.5 inline-flex items-center text-[#356ae6] font-[650] hover:text-[#2458ce] hover:underline hover:underline-offset-3"
            to="/sign-in"
          >
            Retour à la connexion
          </Link>
        </p>
      </AuthLayout>
    );
  if (done)
    return (
      <AuthLayout
        title="Mot de passe modifié"
        description="Vous pouvez maintenant vous connecter avec votre nouveau mot de passe."
      >
        <div
          className="auth-confirmation p-4.5 border border-solid border-[#cce8db] mb-5 rounded-[12px] bg-[#f1faf6] text-[#316e55] text-[13px] leading-[1.8] wrap-anywhere"
          role="status"
        >
          Votre nouveau mot de passe a bien été enregistré.
        </div>
        <Link
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 auth-submit group/auth-submit px-4 py-3 gap-2.5 border border-solid border-[#356ae6] flex items-center justify-center w-full min-h-11.5 rounded-[10px] text-white bg-[#356ae6] text-[13px] leading-normal font-[650] text-center hover:enabled:border-[#2458ce] hover:enabled:bg-[#2458ce] disabled:opacity-65"
          to="/sign-in"
        >
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
      <p className="auth-switch pt-5.75 mt-5.75 border-t border-solid border-t-[#e9edf4] text-center text-xs text-[#7b899e] leading-[1.7]">
        <Link
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 gap-1.5 inline-flex items-center text-[#356ae6] font-[650] hover:text-[#2458ce] hover:underline hover:underline-offset-3"
          to="/sign-in"
        >
          Retour à la connexion
        </Link>
      </p>
    </AuthLayout>
  );
}
