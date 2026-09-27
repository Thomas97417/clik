import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";

import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/auth-server";

import Header from "../components/header";
import ErrorBoundary from "../components/error-boundary";
import NotFound from "../components/not-found";
import appCss from "../index.css?url";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "posthog-js/react";

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
} as const;

export interface RouterAppContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Toma Stack",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: RootDocument,
  beforeLoad: async (ctx) => {
    const token = await getAuth();
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }
    return {
      isAuthenticated: !!token,
      token,
    };
  },
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function RootDocument() {
  const context = useRouteContext({ from: Route.id });
  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <HeadContent />
        </head>
        <body>
          <PostHogProvider
            apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
            options={options}
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              disableTransitionOnChange
              storageKey="vite-ui-theme"
            >
              <div className="grid h-svh grid-rows-[auto_1fr]">
                <Header />
                <div className="overflow-y-auto">
                  <Outlet />
                </div>
              </div>
              <Toaster richColors />
              <TanStackRouterDevtools position="bottom-left" />
              <Scripts />
            </ThemeProvider>
          </PostHogProvider>
        </body>
      </html>
    </ConvexBetterAuthProvider>
  );
}
