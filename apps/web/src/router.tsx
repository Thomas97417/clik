import { ConvexQueryClient } from "@convex-dev/react-query";
import { env } from "@my-better-t-app/env/web";
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import NotFound from "./components/not-found";
import Loader from "./components/loader";
import "./index.css";
import { routeTree } from "./routeTree.gen";
import { RouteSessionCache } from "./lib/auth-session";

export function getRouter() {
  const convexUrl = env.VITE_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is not set");
  }

  const convexQueryClient = new ConvexQueryClient(convexUrl);

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  });
  convexQueryClient.connect(queryClient);

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    // Le contenu défile dans le conteneur partagé du layout, plutôt que window.
    scrollToTopSelectors: [".page-scroll"],
    defaultPreload: "intent",
    defaultPendingComponent: () => <Loader />,
    // Replace loading placeholders as soon as the destination is ready.
    defaultPendingMinMs: 0,
    defaultNotFoundComponent: NotFound,
    context: {
      queryClient,
      convexQueryClient,
      routeSession: new RouteSessionCache(),
    },
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
