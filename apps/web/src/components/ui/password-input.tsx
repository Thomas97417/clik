import { useState } from "react";
import { Input } from "./input";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PasswordInput({
  id,
  placeholder,
  autoComplete,
  value,
  onBlur,
  onChange,
  className,
}: {
  id: string;
  placeholder: string;
  autoComplete: string;
  value: string;
  onBlur: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        id={id}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        value={value}
        onBlur={onBlur}
        onChange={onChange}
        className="bg-transparent pr-9"
      />
      <button
        type="button"
        tabIndex={-1}
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer transition-colors"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
