import { seo } from "@/lib/seo/meta";
import SiteAnalytics from "@/components/site-analytics";
import SiteFooter from "@/components/site-footer";
import { AnalyticsConsentBanner } from "@/components/analytics-preferences";
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

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSessionCookie } from "better-auth/cookies";

import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/auth-server";

import Header from "../components/header";
import ErrorBoundary from "../components/error-boundary";
import NotFound from "../components/not-found";
import appCss from "../index.css?url";
import { ThemeProvider } from "@/components/theme-provider";

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  // Anonymous visitors and crawlers need no round trip to the authentication service.
  const headers = getRequestHeaders();
  if (!getSessionCookie(headers) && !headers.get("authorization"))
    return undefined;
  return await getToken();
});

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
      ...seo({
        title: "Atelier de construction 3D",
        text: "Créez, assemblez et partagez vos constructions en briques 3D avec Clik.",
        path: "/",
        noindex: true,
      }).meta,
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32.png",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: RootDocument,
  beforeLoad: async (
    ctx,
  ): Promise<{ isAuthenticated: boolean; token: string | undefined }> => {
    // Local drafts can change without rechecking the session over the network.
    if (
      typeof navigator !== "undefined" &&
      !navigator.onLine &&
      /^\/editor\/?$/.test(ctx.location.pathname)
    ) {
      const token = ctx.matches.find((match) => match.routeId === "__root__")
        ?.context.token;
      return { isAuthenticated: !!token, token };
    }
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
      <html lang="fr" suppressHydrationWarning>
        <head>
          <HeadContent />
        </head>
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            forcedTheme="light"
            disableTransitionOnChange
            storageKey="vite-ui-theme"
          >
            <div className="grid h-svh grid-rows-[auto_1fr]">
              <Header />
              <div className="page-scroll overflow-y-auto">
                <div className="page-content">
                  <Outlet />
                </div>
                <SiteFooter />
              </div>
            </div>
            <Toaster richColors />
            <SiteAnalytics />
            <AnalyticsConsentBanner />

            <Scripts />
          </ThemeProvider>
        </body>
      </html>
    </ConvexBetterAuthProvider>
  );
}
