import { cn } from "@/lib/utils";
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
    <div className="auth-field min-w-0">
      <div className="auth-label-row flex flex-wrap items-baseline justify-between gap-y-1.5 gap-x-3 mb-2">
        <label
          className="text-[#34425b] text-[13px] font-[650]"
          htmlFor={props.id}
        >
          {label}
        </label>
        {action}
      </div>
      {props.type === "password" ? (
        <PasswordInput
          toggleClassName="size-9.5"
          className="px-3.25 py-2.75 border border-solid border-[#dce4f0] h-11.5 text-[15px] rounded-[10px] bg-[#f9fbfe] [box-shadow:none] max-xs:text-base placeholder:text-[#8997ab] hover:enabled:border-[#b6c8e4] focus-visible:border-[#356ae6] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#e7eeff] focus-visible:outline-offset-1 focus-visible:bg-white aria-invalid:border-[#cf5361] pr-11.5 leading-(--text-xs--line-height) focus-visible:shadow-none aria-invalid:shadow-none focus-visible:ring-0 aria-invalid:ring-0"
          {...input}
        />
      ) : (
        <Input
          className="px-3.25 py-2.75 border border-solid border-[#dce4f0] h-11.5 text-[15px] rounded-[10px] bg-[#f9fbfe] [box-shadow:none] max-xs:text-base placeholder:text-[#8997ab] hover:enabled:border-[#b6c8e4] focus-visible:border-[#356ae6] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#e7eeff] focus-visible:outline-offset-1 focus-visible:bg-white aria-invalid:border-[#cf5361] leading-(--text-xs--line-height) focus-visible:shadow-none aria-invalid:shadow-none focus-visible:ring-0 aria-invalid:ring-0"
          {...input}
        />
      )}
      {hint && (
        <p
          className="auth-hint mt-1.75 text-[11px] leading-[1.6] text-[#75849b]"
          id={`${props.id}-hint`}
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          className="auth-field-error mt-1.75 text-[11px] leading-[1.6] text-[#b13948]"
          id={`${props.id}-error`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthError({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return children ? (
    <div
      className={cn(
        "auth-error group/auth-error p-3 gap-2.25 border border-solid border-[#f1d4d8] flex items-start rounded-[10px] bg-[#fff5f6] text-[#a63244] text-xs leading-[1.65] wrap-anywhere",
        className,
      )}
      role="alert"
    >
      <AlertCircle className="shrink-0 mt-0.5" size={18} aria-hidden="true" />
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
    <button
      className="cursor-pointer disabled:cursor-not-allowed [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 auth-submit group/auth-submit px-4 py-3 gap-2.5 border border-solid border-[#356ae6] flex items-center justify-center w-full min-h-11.5 rounded-[10px] text-white bg-[#356ae6] text-[13px] leading-normal font-[650] text-center hover:enabled:border-[#2458ce] hover:enabled:bg-[#2458ce] disabled:opacity-65"
      type="submit"
      disabled={busy}
    >
      {busy ? (
        <>
          <LoaderCircle
            size={18}
            className="shrink-0 auth-spinner animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          {pending}
        </>
      ) : (
        <>
          {children}
          <ArrowRight className="shrink-0" size={17} aria-hidden="true" />
        </>
      )}
    </button>
  );
}
