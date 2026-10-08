import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
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
        title="Confirmez votre email"
        description="Votre compte est créé. Il reste à confirmer votre adresse pour ouvrir votre espace."
      >
        <div
          className={cn(
            "auth-confirmation p-[18px] border-[length:1px] border-solid border-[color:#cce8db] mb-[20px] rounded-[12px] bg-[#f1faf6] text-[color:#316e55] [font-size:13px] leading-[1.8] [overflow-wrap:anywhere] [&_strong]:block [&_strong]:mb-[7px] [&_strong]:font-[650]",
          )}
          role="status"
        >
          <strong>Un lien vous attend dans votre messagerie.</strong>
          <p>
            Consultez les messages reçus à <b>{createdEmail}</b>, puis ouvrez le
            lien de vérification.
          </p>
        </div>
        <p
          className={cn(
            "auth-help mb-[24px] [font-size:12px] text-[color:#71819a] leading-[1.8]",
          )}
        >
          Rien reçu ? Pensez à regarder dans vos courriers indésirables.
        </p>
        <Link
          className={cn(
            "auth-submit group/auth-submit px-[16px] py-[12px] gap-[10px] border-[length:1px] border-solid border-[color:#356ae6] flex items-center justify-center w-[100%] min-h-[46px] rounded-[10px] text-[color:#fff] bg-[#356ae6] [font-size:13px] leading-[1.5] font-[650] text-center [&:hover:not(:disabled)]:border-[color:#2458ce] [&:hover:not(:disabled)]:bg-[#2458ce] [&:disabled]:opacity-[0.65]",
          )}
          to="/sign-in"
        >
          Aller à la connexion
        </Link>
        <p
          className={cn(
            "auth-switch pt-[23px] mt-[23px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e9edf4] text-center [font-size:12px] text-[color:#7b899e] leading-[1.7] [&_a]:gap-[6px] [&_a]:inline-flex [&_a]:items-center [&_a]:text-[color:#356ae6] [&_a]:font-[650]",
          )}
        >
          <Link to="/verify-email">Recevoir un nouveau lien</Link>
        </p>
      </AuthLayout>
    );
  const busy = form.busy || socialBusy;
  return (
    <AuthLayout
      title="Votre atelier commence ici"
      description="Créez votre compte pour conserver vos constructions en ligne et les partager quand vous le souhaitez."
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
      <p
        className={cn(
          "auth-switch pt-[23px] mt-[23px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e9edf4] text-center [font-size:12px] text-[color:#7b899e] leading-[1.7] [&_a]:gap-[6px] [&_a]:inline-flex [&_a]:items-center [&_a]:text-[color:#356ae6] [&_a]:font-[650]",
        )}
      >
        Déjà un compte ? <Link to="/sign-in">Se connecter</Link>
      </p>
    </AuthLayout>
  );
}
