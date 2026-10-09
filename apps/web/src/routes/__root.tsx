import { seo } from "@/lib/seo/meta";
import SiteAnalyticsProvider from "@/components/site-analytics-provider";
import SiteFooter from "@/components/site-footer";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { RouteSessionCache } from "@/lib/auth-session";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
  useRouteContext,
} from "@tanstack/react-router";

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSessionCookie } from "better-auth/cookies";

import { Toaster } from "@/components/ui/sonner";
import { authClient, observeRouteSession } from "@/lib/auth-client";
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
  routeSession: RouteSessionCache;
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
    const session =
      typeof window === "undefined"
        ? { token: await getAuth() }
        : await ctx.context.routeSession.resolve(
            ctx.location.pathname,
            getAuth,
          );
    const { token } = session;
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
  useEffect(() => {
    context.routeSession.prime(context.token);
    return observeRouteSession(context.routeSession);
  }, [context.routeSession]);
  const isEditor = useLocation({
    select: ({ pathname }) =>
      pathname === "/editor" || pathname.startsWith("/editor/"),
  });
  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <SiteAnalyticsProvider>
        <html
          lang="fr"
          suppressHydrationWarning
          className="print:[&&]:overflow-visible! print:[&&]:h-auto!"
        >
          <head>
            <HeadContent />
          </head>
          <body className="print:[&&]:overflow-visible! print:[&&]:h-auto! font-sans text-base leading-[inherit] [--background:#f8fafc] [--foreground:#202b40] [--card:#fff] [--card-foreground:#202b40] [--primary:#356ae6] [--primary-foreground:#fff] [--secondary:#eaf0fc] [--secondary-foreground:#356ae6] [--accent:#eaf0fc] [--accent-foreground:#2458ce] [--border:#e4e9f1] [--input:#dfe5ee] [--muted:#f0f3f8] [--muted-foreground:#68758a] [--ring:#356ae6] [--radius:0.65rem] [--font-sans:'Avenir_Next','Segoe_UI',sans-serif]">
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              forcedTheme="light"
              disableTransitionOnChange
              storageKey="vite-ui-theme"
            >
              <div className="grid h-svh grid-rows-[auto_1fr] print:block print:h-auto group/h-svh">
                <Header />
                <div
                  className={`page-scroll${isEditor ? "" : " site-blueprint"} overflow-y-auto print:[&&]:overflow-visible! print:[&&]:h-auto! flex flex-col min-h-0 [scrollbar-gutter:stable]`}
                >
                  <div className="page-content print:[&&]:block print:[&&]:h-auto flex-[1_0_auto] only:h-full">
                    <Outlet />
                  </div>
                  <SiteFooter />
                </div>
              </div>
              <Toaster richColors />

              <Scripts />
            </ThemeProvider>
          </body>
        </html>
      </SiteAnalyticsProvider>
    </ConvexBetterAuthProvider>
  );
}
