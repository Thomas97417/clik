import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MailCheck, UserRoundPlus } from "lucide-react";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import {
  authErrorMessage,
  emailSchema,
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
import SocialLoginButtons from "./social-login-buttons";

const schema = z.object({
  name: z.string().trim().min(2, "Indiquez un nom d’au moins 2 caractères."),
  email: emailSchema,
  password: newPasswordSchema,
});
export default function SignUpForm() {
  const [createdEmail, setCreatedEmail] = useState("");
  const [socialBusy, setSocialBusy] = useState(false);
  const form = useAuthForm(
    { name: "", email: "", password: "" },
    schema,
    async (value) => {
      const { error } = await authClient.signUp.email({
        ...value,
        callbackURL: "/sign-in",
      });
      if (error)
        throw new Error(
          authErrorMessage(
            error,
            "Impossible de créer le compte pour le moment. Réessayez.",
          ),
        );
      setCreatedEmail(value.email);
    },
  );
  if (createdEmail)
    return (
      <AuthLayout
        eyebrow="Encore un petit clik"
        title="Confirmez votre email"
        description="Votre compte est créé. Il reste à confirmer votre adresse pour ouvrir votre espace."
        icon={MailCheck}
      >
        <div className="auth-confirmation" role="status">
          <strong>Un lien vous attend dans votre messagerie.</strong>
          <p>
            Consultez les messages reçus à <b>{createdEmail}</b>, puis ouvrez le
            lien de vérification.
          </p>
        </div>
        <p className="auth-help">
          Rien reçu ? Pensez à regarder dans vos courriers indésirables.
        </p>
        <Link className="auth-submit" to="/sign-in">
          Aller à la connexion
        </Link>
        <p className="auth-switch">
          <Link to="/verify-email">Recevoir un nouveau lien</Link>
        </p>
      </AuthLayout>
    );
  const busy = form.busy || socialBusy;
  return (
    <AuthLayout
      eyebrow="Faites place à vos idées"
      title="Votre atelier commence ici"
      description="Créez votre compte pour conserver vos constructions en ligne et les partager quand vous le souhaitez."
      icon={UserRoundPlus}
    >
      <form
        className="auth-form"
        noValidate
        onSubmit={form.submit}
        aria-busy={busy}
      >
        <fieldset disabled={busy}>
          <AuthField
            id="name"
            label="Votre nom"
            autoComplete="name"
            placeholder="Comment vous appeler ?"
            required
            hint="Ce nom accompagne vos créations dans la galerie."
            value={form.values.name}
            onChange={(e) => form.change("name", e.target.value)}
            error={form.errors.name}
          />
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
          <AuthField
            id="password"
            label="Mot de passe"
            type="password"
            autoComplete="new-password"
            placeholder="Choisissez un mot de passe"
            required
            hint={passwordHint}
            value={form.values.password}
            onChange={(e) => form.change("password", e.target.value)}
            error={form.errors.password}
          />
        </fieldset>
        <AuthError>{form.error}</AuthError>
        <AuthSubmit busy={busy} pending="Création du compte…">
          Créer mon compte
        </AuthSubmit>
      </form>
      <SocialLoginButtons disabled={form.busy} onBusyChange={setSocialBusy} />
      <p className="auth-switch">
        Déjà un compte ? <Link to="/sign-in">Se connecter</Link>
      </p>
    </AuthLayout>
  );
}
