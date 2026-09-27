import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Settings,
  Shield,
  Upload,
  Zap,
  CircleCheck,
  Database,
  Lock,
  BarChart3,
  HardDrive,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Toma Stack" },
      {
        name: "description",
        content: "Your personal dashboard overview.",
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const user = useCurrentUser();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-1 pb-8">
        {user ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back, {user.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              Here's an overview of your account.
            </p>
          </>
        ) : (
          <>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-1 h-4 w-48" />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <Shield className="size-4" />
              </div>
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>
              Manage your profile, email, and password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/settings">
              <Button
                variant="outline"
                size="sm"
                className="hover:cursor-pointer"
              >
                <Settings className="size-3.5" />
                Settings
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <Zap className="size-4" />
              </div>
              <CardTitle>Quick start</CardTitle>
            </div>
            <CardDescription>
              This is a starter template. Start building your app from here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              Edit{" "}
              <code className="bg-muted rounded px-1 py-0.5 text-[0.7rem]">
                src/routes/dashboard.tsx
              </code>{" "}
              to customize this page.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <Upload className="size-4" />
              </div>
              <CardTitle>Storage</CardTitle>
            </div>
            <CardDescription>
              Upload and manage files with Cloudflare R2.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/upload">
              <Button
                variant="outline"
                size="sm"
                className="hover:cursor-pointer"
              >
                <Upload className="size-3.5" />
                Upload files
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                  <CircleCheck className="size-4" />
                </div>
                <CardTitle>Status</CardTitle>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[0.65rem] font-medium text-green-600 dark:text-green-400">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
                </span>
                Operational
              </span>
            </div>
            <CardDescription>All services are running.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2.5 text-xs">
              {[
                { icon: Lock, label: "Authentication", value: "Better Auth" },
                { icon: Database, label: "Database", value: "Convex" },
                { icon: BarChart3, label: "Analytics", value: "PostHog" },
                { icon: HardDrive, label: "Storage", value: "Cloudflare R2" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Icon className="size-3" />
                    {label}
                  </span>
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <CircleCheck className="size-3" />
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
