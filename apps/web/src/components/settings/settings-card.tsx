import { cn } from "@/lib/utils";

export function SettingsCard({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "settings-card overflow-hidden border border-solid border-[#e0e7f1] flex flex-col bg-white rounded-[14px] size-full",
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
    <div
      className={cn(
        "settings-card-content p-6 gap-5 flex flex-col max-sm:p-5",
        className,
      )}
    >
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
        "settings-card-footer px-6 py-4 gap-3.5 flex items-start flex-col mt-auto border-t border-solid border-t-[#e8edf5] bg-[#fafbfd] max-sm:px-5",
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
    <div className="settings-card-heading">
      <h3 className="mx-0 text-sm leading-[inherit] font-semibold mt-0 mb-1.5">
        {title}
      </h3>
      <p className="m-0 text-xs text-[#77869c] leading-[1.65]">{description}</p>
    </div>
  );
}
