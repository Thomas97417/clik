import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo/meta";
import SiteAnalyticsProvider from "@/components/site-analytics-provider";
import SiteFooter from "@/components/site-footer";
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
      <SiteAnalyticsProvider>
        <html
          lang="fr"
          suppressHydrationWarning
          className={cn("print:[&&]:overflow-visible! print:[&&]:h-[auto]!")}
        >
          <head>
            <HeadContent />
          </head>
          <body
            className={cn(
              "print:[&&]:overflow-visible! print:[&&]:h-[auto]! print:[&&]:[:where(&)_>_div]:block print:[&&]:[:where(&)_>_div]:h-[auto] font-[family-name:var(--font-sans)] [font-size:16px] [:where(&)_button]:[outline-offset:3px] [:where(&)_button]:cursor-[pointer] [:where(&)_button]:[transition:background_0.15s,_color_0.15s,_box-shadow_0.15s] [:where(&)_a]:[outline-offset:3px] [:where(&)_a]:[transition:background_0.15s,_color_0.15s,_box-shadow_0.15s] [:where(&)_input]:[outline-offset:3px] [:where(&)_select]:[outline-offset:3px] [:where(&)_textarea]:[outline-offset:3px] [:where(&)_button:disabled]:cursor-[not-allowed] [:where(&)_button:disabled]:opacity-[0.4] [:where(&)_h1]:m-[0] [:where(&)_h2]:m-[0] [:where(&)_p]:m-[0] [:where(&)_button_svg]:shrink-[0] [:where(&)_a:focus-visible]:[outline:2px_solid_#356ae6] [:where(&)_button:focus-visible]:[outline:2px_solid_#356ae6] [:where(&)_[data-nav-tone]]:[--nav-fill:#edf3ff] [:where(&)_[data-nav-tone]]:[--nav-hover:#dfeaff] [:where(&)_[data-nav-tone]]:[--nav-ink:#3b609c] [:where(&)_[data-nav-tone]]:[--nav-active:#356ae6] [:where(&)_[data-nav-tone]]:[--nav-active-hover:#285bd3] [:where(&)_[data-nav-tone]]:[--nav-active-ink:#fff] [:where(&)_[data-nav-tone]]:[--nav-tilt:-1.5deg] [:where(&)_[data-nav-tone][data-nav-tone='peach']]:[--nav-fill:#fff0e5] [:where(&)_[data-nav-tone][data-nav-tone='peach']]:[--nav-hover:#ffe4d1] [:where(&)_[data-nav-tone][data-nav-tone='peach']]:[--nav-ink:#895b3b] [:where(&)_[data-nav-tone][data-nav-tone='peach']]:[--nav-active:#ffd1ad] [:where(&)_[data-nav-tone][data-nav-tone='peach']]:[--nav-active-hover:#ffc394] [:where(&)_[data-nav-tone][data-nav-tone='peach']]:[--nav-active-ink:#824321] [:where(&)_[data-nav-tone][data-nav-tone='peach']]:[--nav-tilt:1.5deg] [:where(&)_[data-nav-tone][data-nav-tone='lilac']]:[--nav-fill:#f1edfb] [:where(&)_[data-nav-tone][data-nav-tone='lilac']]:[--nav-hover:#e7def8] [:where(&)_[data-nav-tone][data-nav-tone='lilac']]:[--nav-ink:#725899] [:where(&)_[data-nav-tone][data-nav-tone='lilac']]:[--nav-active:#d7c5f5] [:where(&)_[data-nav-tone][data-nav-tone='lilac']]:[--nav-active-hover:#ccb5f0] [:where(&)_[data-nav-tone][data-nav-tone='lilac']]:[--nav-active-ink:#65429b] [:where(&)_[data-nav-tone][data-nav-tone='lilac']]:[--nav-tilt:-1deg] [:where(&)_[data-nav-tone][data-nav-tone='mint']]:[--nav-fill:#eaf5ef] [:where(&)_[data-nav-tone][data-nav-tone='mint']]:[--nav-hover:#d9ede2] [:where(&)_[data-nav-tone][data-nav-tone='mint']]:[--nav-ink:#437660] [:where(&)_[data-nav-tone][data-nav-tone='mint']]:[--nav-active:#bce6d2] [:where(&)_[data-nav-tone][data-nav-tone='mint']]:[--nav-active-hover:#a8dcc3] [:where(&)_[data-nav-tone][data-nav-tone='mint']]:[--nav-active-ink:#225e48] [:where(&)_[data-nav-tone][data-nav-tone='mint']]:[--nav-tilt:1.5deg] [--background:#f8fafc] [--foreground:#202b40] [--card:#fff] [--card-foreground:#202b40] [--primary:#356ae6] [--primary-foreground:#fff] [--secondary:#eaf0fc] [--secondary-foreground:#356ae6] [--accent:#eaf0fc] [--accent-foreground:#2458ce] [--border:#e4e9f1] [--input:#dfe5ee] [--muted:#f0f3f8] [--muted-foreground:#68758a] [--ring:#356ae6] [--radius:0.65rem] [--font-sans:'Avenir_Next',_'Segoe_UI',_sans-serif]",
            )}
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              forcedTheme="light"
              disableTransitionOnChange
              storageKey="vite-ui-theme"
            >
              <div
                className={cn(
                  "grid h-svh grid-rows-[auto_1fr] print:[&&]:[body_&[class~='group/h-svh']]:block print:[&&]:[body_&[class~='group/h-svh']]:h-[auto] group/h-svh",
                )}
              >
                <Header />
                <div
                  className={cn(
                    "page-scroll overflow-y-auto print:[&&]:overflow-visible! print:[&&]:h-[auto]! flex flex-col min-h-[0] [scrollbar-gutter:stable]",
                  )}
                >
                  <div
                    className={cn(
                      "page-content print:[&&]:block print:[&&]:h-[auto] flex-[1_0_auto] [&:only-child]:h-[100%]",
                    )}
                  >
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
