import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { useHydrated } from "@tanstack/react-router";
export default function PublicMore({
  href,
  loading,
  onMore,
  children,
  className,
}: {
  href: string;
  loading: boolean;
  onMore: () => void;
  children: ReactNode;
  className?: string;
}) {
  const hydrated = useHydrated();
  return (
    <Button
      variant="outline"
      className={className}
      nativeButton={false}
      role={hydrated ? "button" : "link"}
      render={
        <a
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3"
          href={href}
        />
      }
      disabled={loading}
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        onMore();
      }}
    >
      {children}
    </Button>
  );
}
