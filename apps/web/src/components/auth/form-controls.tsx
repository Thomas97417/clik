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
    <div
      className={cn(
        "auth-field min-w-[0] [&&_input]:px-[13px] [&&_input]:py-[11px] [&&_input]:border-[length:1px] [&&_input]:border-solid [&&_input]:border-[color:#dce4f0] [&&_input]:h-[46px] [&&_input]:[font-size:15px] [&&_input]:rounded-[10px] [&&_input]:bg-[#f9fbfe] [&&_input]:[box-shadow:none] [@media(width<=440px)]:[&&_input]:[font-size:16px] [&&_input::placeholder]:text-[color:#8997ab] [&&_input:hover:not(:disabled)]:border-[color:#b6c8e4] [&&_input:focus-visible]:border-[color:#356ae6] [&&_input:focus-visible]:[outline:3px_solid_#e7eeff] [&&_input:focus-visible]:[outline-offset:1px] [&&_input:focus-visible]:bg-[#fff] [&&_input[aria-invalid='true']]:border-[color:#cf5361] [&&_[class~='group/password-field']_input]:pr-[46px] [&_[class~='group/password-toggle']]:w-[38px] [&_[class~='group/password-toggle']]:h-[38px]",
      )}
    >
      <div
        className={cn(
          "auth-label-row flex flex-wrap items-baseline justify-between gap-y-[6px] gap-x-[12px] mb-[8px] [&_label]:text-[color:#34425b] [&_label]:[font-size:13px] [&_label]:font-[650] [&_a]:[font-size:11px] [&_a]:text-[color:#356ae6]",
        )}
      >
        <label htmlFor={props.id}>{label}</label>
        {action}
      </div>
      {props.type === "password" ? (
        <PasswordInput {...input} />
      ) : (
        <Input {...input} />
      )}
      {hint && (
        <p
          className={cn(
            "auth-hint mt-[7px] [font-size:11px] leading-[1.6] text-[color:#75849b]",
          )}
          id={`${props.id}-hint`}
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          className={cn(
            "auth-field-error mt-[7px] [font-size:11px] leading-[1.6] text-[color:#b13948]",
          )}
          id={`${props.id}-error`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthError({ children }: { children?: ReactNode }) {
  return children ? (
    <div
      className={cn(
        "auth-error group/auth-error p-[12px] gap-[9px] border-[length:1px] border-solid border-[color:#f1d4d8] flex items-start rounded-[10px] bg-[#fff5f6] text-[color:#a63244] [font-size:12px] leading-[1.65] [overflow-wrap:anywhere] [&_svg]:shrink-[0] [&_svg]:mt-[2px] [&_a]:block [&_a]:mt-[6px] [&_a]:[text-decoration:underline] [&_a]:font-[600]",
      )}
      role="alert"
    >
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
    <button
      className={cn(
        "auth-submit group/auth-submit px-[16px] py-[12px] gap-[10px] border-[length:1px] border-solid border-[color:#356ae6] flex items-center justify-center w-[100%] min-h-[46px] rounded-[10px] text-[color:#fff] bg-[#356ae6] [font-size:13px] leading-[1.5] font-[650] text-center [&:hover:not(:disabled)]:border-[color:#2458ce] [&:hover:not(:disabled)]:bg-[#2458ce] [&:disabled]:opacity-[0.65]",
      )}
      type="submit"
      disabled={busy}
    >
      {busy ? (
        <>
          <LoaderCircle
            size={18}
            className={cn(
              "auth-spinner [animation:spin_1s_linear_infinite] motion-reduce:[animation:none]",
            )}
            aria-hidden="true"
          />
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
