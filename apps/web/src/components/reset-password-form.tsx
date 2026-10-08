import { cn } from "@/lib/utils";
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
          className={cn(
            "auth-submit group/auth-submit px-[16px] py-[12px] gap-[10px] border-[length:1px] border-solid border-[color:#356ae6] flex items-center justify-center w-[100%] min-h-[46px] rounded-[10px] text-[color:#fff] bg-[#356ae6] [font-size:13px] leading-[1.5] font-[650] text-center [&:hover:not(:disabled)]:border-[color:#2458ce] [&:hover:not(:disabled)]:bg-[#2458ce] [&:disabled]:opacity-[0.65]",
          )}
          to="/forgot-password"
        >
          Demander un nouveau lien
        </Link>
        <p
          className={cn(
            "auth-switch pt-[23px] mt-[23px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e9edf4] text-center [font-size:12px] text-[color:#7b899e] leading-[1.7] [&_a]:gap-[6px] [&_a]:inline-flex [&_a]:items-center [&_a]:text-[color:#356ae6] [&_a]:font-[650]",
          )}
        >
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
        <div
          className={cn(
            "auth-confirmation p-[18px] border-[length:1px] border-solid border-[color:#cce8db] mb-[20px] rounded-[12px] bg-[#f1faf6] text-[color:#316e55] [font-size:13px] leading-[1.8] [overflow-wrap:anywhere] [&_strong]:block [&_strong]:mb-[7px] [&_strong]:font-[650]",
          )}
          role="status"
        >
          Votre nouveau mot de passe a bien été enregistré.
        </div>
        <Link
          className={cn(
            "auth-submit group/auth-submit px-[16px] py-[12px] gap-[10px] border-[length:1px] border-solid border-[color:#356ae6] flex items-center justify-center w-[100%] min-h-[46px] rounded-[10px] text-[color:#fff] bg-[#356ae6] [font-size:13px] leading-[1.5] font-[650] text-center [&:hover:not(:disabled)]:border-[color:#2458ce] [&:hover:not(:disabled)]:bg-[#2458ce] [&:disabled]:opacity-[0.65]",
          )}
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
        className={cn(
          "auth-form gap-[19px] grid min-w-[0] [&_fieldset]:p-[0] [&_fieldset]:m-[0] [&_fieldset]:gap-[19px] [&_fieldset]:border-[length:0] [&_fieldset]:border-none [&_fieldset]:border-[color:currentColor] [&_fieldset]:grid [&_fieldset]:min-w-[0]",
        )}
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
      <p
        className={cn(
          "auth-switch pt-[23px] mt-[23px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e9edf4] text-center [font-size:12px] text-[color:#7b899e] leading-[1.7] [&_a]:gap-[6px] [&_a]:inline-flex [&_a]:items-center [&_a]:text-[color:#356ae6] [&_a]:font-[650]",
        )}
      >
        <Link to="/sign-in">Retour à la connexion</Link>
      </p>
    </AuthLayout>
  );
}
