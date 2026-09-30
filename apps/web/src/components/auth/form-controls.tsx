import {
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { AlertCircle, ArrowRight, LoaderCircle } from "lucide-react";
import type z from "zod";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/ui/password-input";

export function useAuthForm<T extends Record<string, string>>(
  defaults: T,
  schema: z.ZodType<T>,
  onSubmit: (values: T) => Promise<void>,
) {
  const [values, setValues] = useState(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const change = (name: keyof T, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setError("");
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    const result = schema.safeParse(values);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const name = String(issue.path[0]);
        next[name] ??= issue.message;
      }
      setErrors(next);
      const input = event.currentTarget.elements.namedItem(
        Object.keys(next)[0],
      );
      if (input instanceof HTMLElement) input.focus();
      return;
    }
    setErrors({});
    submitting.current = true;
    setBusy(true);
    try {
      await onSubmit(result.data);
    } catch (cause) {
      setError(
        cause instanceof Error && !(cause instanceof TypeError)
          ? cause.message
          : "La demande n’a pas abouti. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return { values, errors, error, setError, busy, change, submit };
}

export function AuthField({
  label,
  error,
  hint,
  action,
  ...props
}: ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  action?: ReactNode;
}) {
  const describedBy =
    [hint && `${props.id}-hint`, error && `${props.id}-error`]
      .filter(Boolean)
      .join(" ") || undefined;
  const input = {
    ...props,
    name: props.name ?? props.id,
    "aria-invalid": !!error,
    "aria-describedby": describedBy,
  };
  return (
    <div className="auth-field">
      <div className="auth-label-row">
        <label htmlFor={props.id}>{label}</label>
        {action}
      </div>
      {props.type === "password" ? (
        <PasswordInput {...input} />
      ) : (
        <Input {...input} />
      )}
      {hint && (
        <p className="auth-hint" id={`${props.id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="auth-field-error" id={`${props.id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthError({ children }: { children?: ReactNode }) {
  return children ? (
    <div className="auth-error" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  ) : null;
}

export function AuthSubmit({
  busy,
  children,
  pending = "Envoi en cours…",
}: {
  busy: boolean;
  children: ReactNode;
  pending?: string;
}) {
  return (
    <button className="auth-submit" type="submit" disabled={busy}>
      {busy ? (
        <>
          <LoaderCircle size={18} className="auth-spinner" aria-hidden="true" />
          {pending}
        </>
      ) : (
        <>
          {children}
          <ArrowRight size={17} aria-hidden="true" />
        </>
      )}
    </button>
  );
}
