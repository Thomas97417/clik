import { cn } from "@/lib/utils";

export function SettingsCard({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "settings-card overflow-hidden border-[length:1px] border-solid border-[color:#e0e7f1] w-[100%] h-[100%] flex flex-col bg-[#fff] rounded-[14px] [&_label]:[font-size:12px] [&_label]:text-[color:#445771] [&_label]:mb-[5px] [&&_input]:px-[12px] [&&_input]:border-[length:1px] [&&_input]:border-solid [&&_input]:border-[color:#dce4ef] [&&_input]:w-[100%] [&&_input]:min-w-[0] [&&_input]:min-h-[42px] [&&_input]:rounded-[8px] [&&_input]:[font-size:13px] [&&_input]:[box-shadow:none] [&&_input:focus-visible]:border-[color:#356ae6] [&&_input:focus-visible]:[outline:2px_solid_#356ae626] [&&_input:focus-visible]:[outline-offset:2px] [&&_[class~='group/password-field']_input]:pr-[40px]",
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
        "settings-card-content p-[24px] gap-[20px] flex flex-col [@media(width<=640px)]:p-[20px]",
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
        "settings-card-footer px-[24px] py-[16px] gap-[14px] flex items-start flex-col mt-[auto] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e8edf5] bg-[#fafbfd] [@media(width<=640px)]:px-[20px] [&_p]:[font-size:11px] [&_p]:text-[color:#7c899d] [&_p]:leading-[1.6] [&_button]:px-[12px] [&_button]:min-h-[36px] [&_button]:rounded-[7px] [&_button]:[font-size:11px] [&_button]:[white-space:normal]",
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
    <div
      className={cn(
        "settings-card-heading [&_h3]:mx-[0] [&_h3]:[font-size:14px] [&_h3]:font-[600] [&_h3]:mt-[0] [&_h3]:mb-[6px] [&_p]:m-[0] [&_p]:[font-size:12px] [&_p]:text-[color:#77869c] [&_p]:leading-[1.65]",
      )}
    >
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
