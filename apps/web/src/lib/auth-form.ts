import z from "zod";

export const emailSchema = z
  .string()
  .trim()
  .pipe(z.email("Indiquez une adresse email valide."));
export const passwordHint =
  "8 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.";
export const newPasswordSchema = z
  .string()
  .min(8, "Utilisez au moins 8 caractères.")
  .max(128, "Utilisez au maximum 128 caractères.")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/,
    "Ajoutez une majuscule, une minuscule, un chiffre et un caractère spécial.",
  );

export function authErrorMessage(
  error: { code?: string; status?: number } | null,
  fallback: string,
) {
  if (error?.status === 429)
    return "Trop de tentatives. Patientez quelques instants avant de réessayer.";
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "L’adresse email ou le mot de passe est incorrect.";
    case "EMAIL_NOT_VERIFIED":
      return "Confirmez votre adresse email avant de vous connecter.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Un compte utilise déjà cette adresse. Connectez-vous ou réinitialisez votre mot de passe.";
    case "PASSWORD_TOO_SHORT":
      return "Utilisez au moins 8 caractères pour votre mot de passe.";
    case "INVALID_TOKEN":
    case "TOKEN_EXPIRED":
      return "Ce lien n’est plus valide. Demandez un nouveau lien pour continuer.";
    default:
      return fallback;
  }
}

export function authReturnTo() {
  try {
    const path = sessionStorage.getItem("clik-return-to") || "/editor";
    return /^\/(editor|creations|projects|gallery|challenges)(\/|\?|$)/.test(
      path,
    ) && !path.includes("\\")
      ? path
      : "/editor";
  } catch {
    return "/editor";
  }
}
