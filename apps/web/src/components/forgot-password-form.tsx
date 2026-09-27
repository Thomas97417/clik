import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await authClient.requestPasswordReset({
          email: value.email,
          redirectTo: "/reset-password",
        });
        setSent(true);
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
      }),
    },
  });

  if (sent) {
    return (
      <div className="mx-auto w-full mt-10 max-w-md p-6 text-center space-y-3">
        <h1 className="text-3xl font-bold">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, a reset link has been sent.
        </p>
        <Link
          to="/sign-in"
          className="inline-block text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      <h1 className="mb-2 text-center text-3xl font-bold">Forgot password?</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Enter your email and we'll send you a reset link.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  placeholder="john.doe@example.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500 text-sm">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe>
          {(state) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? "Sending..." : "Send reset link"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Link
          to="/sign-in"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
