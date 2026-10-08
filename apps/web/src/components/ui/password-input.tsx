import { useState, type ComponentProps } from "react";
import { Input } from "./input";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PasswordInput({
  className,
  toggleClassName,
  ...props
}: ComponentProps<typeof Input> & { id: string; toggleClassName?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative w-full password-field group/password-field">
      <Input
        {...props}
        required={props.required ?? true}
        type={visible ? "text" : "password"}
        className={cn("bg-transparent pr-11", className)}
      />
      <button
        type="button"
        className={cn(
          "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
          "[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6]",
          "outline-offset-3",
          "password-toggle group/password-toggle grid place-items-center absolute top-1/2 right-0.75 transform-[translateY(-50%)] w-8 h-7.5 rounded-[7px] text-[#7787a0] hover:text-[#356ae6] hover:bg-[#eaf0fc]",
          toggleClassName,
        )}
        aria-label={
          visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
        }
        aria-controls={props.id}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? (
          <EyeOff className="shrink-0" size={17} aria-hidden="true" />
        ) : (
          <Eye className="shrink-0" size={17} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
