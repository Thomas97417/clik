import { convexQuery } from "@convex-dev/react-query";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Toma Stack — Modern Full-Stack Starter" },
      {
        name: "description",
        content:
          "A production-ready starter built with TanStack Start, Convex, Better Auth, Cloudflare R2, PostHog, and Tailwind CSS.",
      },
    ],
  }),
  component: HomeComponent,
});

const TITLE_TEXT = `
 ████████╗ ██████╗ ███╗   ███╗ █████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝██╔═══██╗████╗ ████║██╔══██╗   ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║   ██║   ██║██╔████╔██║███████║   ███████╗   ██║   ███████║██║     █████╔╝
    ██║   ██║   ██║██║╚██╔╝██║██╔══██║   ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║   ╚██████╔╝██║ ╚═╝ ██║██║  ██║   ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝   ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

const FEATURES = [
  {
    title: "TanStack Start",
    description:
      "Full-stack SSR framework with file-based routing and type-safe data loading",
    link: "https://tanstack.com/start",
  },
  {
    title: "Convex",
    description:
      "Reactive backend with real-time sync, automatic caching, and serverless functions",
    link: "https://convex.dev",
  },
  {
    title: "Better Auth",
    description:
      "Flexible authentication with email/password, Google, and GitHub providers",
    link: "https://better-auth.com",
  },
  {
    title: "Cloudflare R2",
    description:
      "S3-compatible object storage with zero egress fees for file uploads",
    link: "https://developers.cloudflare.com/r2",
  },
  {
    title: "PostHog",
    description:
      "Product analytics, session replay, and feature flags for data-driven decisions",
    link: "https://posthog.com",
  },
  {
    title: "Tailwind + shadcn/ui",
    description:
      "Utility-first CSS with beautifully designed, accessible components",
    link: "https://tailwindcss.com",
  },
];

const STACK = ["React 19", "TypeScript", "Bun", "Turborepo"];

function StatusBadge() {
  const healthCheck = useQuery(convexQuery(api.healthCheck.get, {}));

  const isOk = healthCheck.data === "OK";
  const isLoading = healthCheck.isLoading;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs backdrop-blur-sm">
      <span className="relative flex size-2">
        <span
          className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${isOk ? "bg-green-500" : isLoading ? "bg-orange-400" : "bg-red-500"}`}
        />
        <span
          className={`relative inline-flex size-2 rounded-full ${isOk ? "bg-green-500" : isLoading ? "bg-orange-400" : "bg-red-500"}`}
        />
      </span>
      <span className="text-muted-foreground">
        {isLoading
          ? "Connecting..."
          : isOk
            ? "Backend connected"
            : "Connection error"}
      </span>
    </div>
  );
}

function HomeComponent() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="relative flex w-full flex-col items-center gap-8 px-4 pt-16 pb-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="bg-primary/5 absolute top-1/2 left-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />
        </div>

        <div className="relative flex flex-col items-center gap-6">
          <pre className="text-primary overflow-x-auto font-mono text-[0.5rem] leading-tight select-none sm:text-xs">
            {TITLE_TEXT}
          </pre>

          <div className="flex flex-col items-center gap-3">
            <h1 className="max-w-lg text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Ship faster with the modern full-stack starter
            </h1>
            <p className="text-muted-foreground max-w-md text-center text-sm leading-relaxed">
              Everything you need to build production-ready apps —
              authentication, real-time data, SSR, and beautiful UI out of the
              box.
            </p>
          </div>

          <StatusBadge />
        </div>

        <div className="relative flex gap-3">
          <Authenticated>
            <Link to="/dashboard">
              <Button size="lg" className="hover:cursor-pointer gap-2">
                Go to Dashboard
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </Authenticated>
          <Unauthenticated>
            <Link to="/sign-in">
              <Button size="lg" className="hover:cursor-pointer gap-2">
                Get Started
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/sign-up">
              <Button
                variant="outline"
                size="lg"
                className="hover:cursor-pointer"
              >
                Create Account
              </Button>
            </Link>
          </Unauthenticated>
        </div>

        {/* Stack pills */}
        <div className="relative flex flex-wrap justify-center gap-2">
          {STACK.map((tech) => (
            <span
              key={tech}
              className="text-muted-foreground rounded-full border px-3 py-1 text-xs"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-3xl px-4 pb-20">
        <div className="mb-6 flex flex-col items-center gap-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Built with the best
          </h2>
          <p className="text-muted-foreground text-sm">
            A curated stack for developer experience and performance.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <a
              key={feature.title}
              href={feature.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2 rounded-lg border p-5 transition-all hover:border-primary/30 hover:bg-muted/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{feature.title}</h3>
                <ExternalLink className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {feature.description}
              </p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
