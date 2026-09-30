import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
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
      eyebrow="De retour à l’atelier"
      title="Heureux de vous retrouver"
      description="Connectez-vous pour retrouver vos créations et continuer là où votre imagination s’est arrêtée."
      icon={LogIn}
    >
      <form
        className="auth-form"
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
      <p className="auth-switch">
        Première visite ? <Link to="/sign-up">Créer un compte</Link>
      </p>
      <Link className="auth-secondary-link" to="/verify-email">
        Vérifier mon adresse email
      </Link>
    </AuthLayout>
  );
}
