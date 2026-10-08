import { useState } from "react";
import { Link } from "@tanstack/react-router";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, authReturnTo, emailSchema } from "@/lib/auth-form";
import AuthLayout from "./auth/auth-layout";
import {
  AuthError,
  AuthField,
  AuthSubmit,
  useAuthForm,
} from "./auth/form-controls";
import SocialLoginButtons from "./social-login-buttons";

const schema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Indiquez votre mot de passe."),
});

export default function SignInForm() {
  const [verify, setVerify] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const form = useAuthForm(
    { email: "", password: "" },
    schema,
    async (value) => {
      setVerify(false);
      const { error } = await authClient.signIn.email(value);
      if (error) {
        setVerify(error.code === "EMAIL_NOT_VERIFIED" || error.status === 403);
        throw new Error(
          authErrorMessage(
            error,
            "Connexion impossible. Vérifiez vos identifiants et réessayez.",
          ),
        );
      }
      window.location.assign(authReturnTo());
    },
  );
  const busy = form.busy || socialBusy;
  return (
    <AuthLayout
      title="Heureux de vous retrouver"
      description="Connectez-vous pour retrouver vos créations et continuer là où votre imagination s’est arrêtée."
    >
      <form
        className="auth-form gap-4.75 grid min-w-0"
        noValidate
        onSubmit={form.submit}
        aria-busy={busy}
      >
        <fieldset
          className="p-0 m-0 gap-4.75 border-0 border-none border-current grid min-w-0"
          disabled={busy}
        >
          <AuthField
            id="email"
            label="Adresse email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.fr"
            required
            value={form.values.email}
            onChange={(e) => {
              form.change("email", e.target.value);
              setVerify(false);
            }}
            error={form.errors.email}
          />
          <AuthField
            id="password"
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            placeholder="Votre mot de passe"
            required
            value={form.values.password}
            onChange={(e) => form.change("password", e.target.value)}
            error={form.errors.password}
            action={
              <Link
                className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 text-[11px] text-[#356ae6] hover:text-[#2458ce] hover:underline hover:underline-offset-3"
                to="/forgot-password"
              >
                Mot de passe oublié ?
              </Link>
            }
          />
        </fieldset>
        <AuthError>
          {form.error && (
            <>
              {form.error}
              {verify && (
                <Link
                  className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 block mt-1.5 underline font-semibold hover:text-[#2458ce] hover:underline hover:underline-offset-3"
                  to="/verify-email"
                >
                  Recevoir un lien de vérification
                </Link>
              )}
            </>
          )}
        </AuthError>
        <AuthSubmit busy={busy} pending="Connexion en cours…">
          Se connecter
        </AuthSubmit>
      </form>
      <SocialLoginButtons disabled={form.busy} onBusyChange={setSocialBusy} />
      <p className="auth-switch pt-5.75 mt-5.75 border-t border-solid border-t-[#e9edf4] text-center text-xs text-[#7b899e] leading-[1.7]">
        Première visite ?{" "}
        <Link
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 gap-1.5 inline-flex items-center text-[#356ae6] font-[650] hover:text-[#2458ce] hover:underline hover:underline-offset-3"
          to="/sign-up"
        >
          Créer un compte
        </Link>
      </p>
      <Link
        className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 auth-secondary-link mx-auto block mt-3.75 mb-0 w-fit text-[#71809a] text-[11px] text-center hover:text-[#2458ce] hover:underline hover:underline-offset-3"
        to="/verify-email"
      >
        Vérifier mon adresse email
      </Link>
    </AuthLayout>
  );
}
