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
          className="auth-confirmation p-4.5 border border-solid border-[#cce8db] mb-5 rounded-[12px] bg-[#f1faf6] text-[#316e55] text-[13px] leading-[1.8] wrap-anywhere"
          role="status"
        >
          <strong className="block mb-1.75 font-[650]">
            Un lien vous attend dans votre messagerie.
          </strong>
          <p>
            Consultez les messages reçus à <b>{createdEmail}</b>, puis ouvrez le
            lien de vérification.
          </p>
        </div>
        <p className="auth-help mb-6 text-xs text-[#71819a] leading-[1.8]">
          Rien reçu ? Pensez à regarder dans vos courriers indésirables.
        </p>
        <Link
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 auth-submit group/auth-submit px-4 py-3 gap-2.5 border border-solid border-[#356ae6] flex items-center justify-center w-full min-h-11.5 rounded-[10px] text-white bg-[#356ae6] text-[13px] leading-normal font-[650] text-center hover:enabled:border-[#2458ce] hover:enabled:bg-[#2458ce] disabled:opacity-65"
          to="/sign-in"
        >
          Aller à la connexion
        </Link>
        <p className="auth-switch pt-5.75 mt-5.75 border-t border-solid border-t-[#e9edf4] text-center text-xs text-[#7b899e] leading-[1.7]">
          <Link
            className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 gap-1.5 inline-flex items-center text-[#356ae6] font-[650] hover:text-[#2458ce] hover:underline hover:underline-offset-3"
            to="/verify-email"
          >
            Recevoir un nouveau lien
          </Link>
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
      <p className="auth-switch pt-5.75 mt-5.75 border-t border-solid border-t-[#e9edf4] text-center text-xs text-[#7b899e] leading-[1.7]">
        Déjà un compte ?{" "}
        <Link
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 gap-1.5 inline-flex items-center text-[#356ae6] font-[650] hover:text-[#2458ce] hover:underline hover:underline-offset-3"
          to="/sign-in"
        >
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
}
