import { cn } from "@/lib/utils";

export function SettingsCard({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start rounded-lg border border-border bg-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SettingsCardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-4 p-6", className)}>
      {children}
    </div>
  );
}

export function SettingsCardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-14 w-full items-center justify-between rounded-b-lg border-t border-border bg-muted px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsCardHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
