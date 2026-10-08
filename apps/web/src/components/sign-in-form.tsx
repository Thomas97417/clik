import { cn } from "@/lib/utils";
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
        className={cn(
          "auth-form gap-[19px] grid min-w-[0] [&_fieldset]:p-[0] [&_fieldset]:m-[0] [&_fieldset]:gap-[19px] [&_fieldset]:border-[length:0] [&_fieldset]:border-none [&_fieldset]:border-[color:currentColor] [&_fieldset]:grid [&_fieldset]:min-w-[0]",
        )}
        noValidate
        onSubmit={form.submit}
        aria-busy={busy}
      >
        <fieldset disabled={busy}>
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
            action={<Link to="/forgot-password">Mot de passe oublié ?</Link>}
          />
        </fieldset>
        <AuthError>
          {form.error && (
            <>
              {form.error}
              {verify && (
                <Link to="/verify-email">Recevoir un lien de vérification</Link>
              )}
            </>
          )}
        </AuthError>
        <AuthSubmit busy={busy} pending="Connexion en cours…">
          Se connecter
        </AuthSubmit>
      </form>
      <SocialLoginButtons disabled={form.busy} onBusyChange={setSocialBusy} />
      <p
        className={cn(
          "auth-switch pt-[23px] mt-[23px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e9edf4] text-center [font-size:12px] text-[color:#7b899e] leading-[1.7] [&_a]:gap-[6px] [&_a]:inline-flex [&_a]:items-center [&_a]:text-[color:#356ae6] [&_a]:font-[650]",
        )}
      >
        Première visite ? <Link to="/sign-up">Créer un compte</Link>
      </p>
      <Link
        className={cn(
          "auth-secondary-link mx-[auto] block mt-[15px] mb-[0] w-[fit-content] text-[color:#71809a] [font-size:11px] text-center [&:hover]:text-[color:#2458ce] [&:hover]:[text-decoration:underline] [&:hover]:underline-offset-[3px]",
        )}
        to="/verify-email"
      >
        Vérifier mon adresse email
      </Link>
    </AuthLayout>
  );
}
