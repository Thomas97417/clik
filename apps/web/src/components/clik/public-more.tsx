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
      render={<a href={href} />}
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
