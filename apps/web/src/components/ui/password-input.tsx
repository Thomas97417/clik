import { useState, type ComponentProps } from "react";
import { Input } from "./input";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PasswordInput({
  className,
  ...props
}: ComponentProps<typeof Input> & { id: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={cn("relative w-full password-field", className)}>
      <Input
        {...props}
        required={props.required ?? true}
        type={visible ? "text" : "password"}
        className="bg-transparent pr-11"
      />
      <button
        type="button"
        className="password-toggle"
        aria-label={
          visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
        }
        aria-controls={props.id}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? (
          <EyeOff size={17} aria-hidden="true" />
        ) : (
          <Eye size={17} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
