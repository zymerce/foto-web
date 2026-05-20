"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/sonner";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";
import { fetchMe, storeAccessToken, writeCachedUser } from "@/lib/session";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const baseUrl = apiBaseUrl();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  useEffect(() => {
    const run = async () => {
      const me = await fetchMe(baseUrl);
      if (me.ok) router.replace("/app/home");
    };
    void run();
  }, [baseUrl, router]);

  async function onSubmit(values: LoginValues) {
    try {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const message = await parseError(response, `Login failed (${response.status})`);
        form.setError("root", { message });
        toast.error("Sign-in failed", { description: message });
        return;
      }

      const data = (await response.json()) as { access_token: string; user?: { email: string | null; username: string | null; roles: string[]; account_type: string; email_verified: boolean } };
      storeAccessToken(data.access_token);
      if (data.user) writeCachedUser(data.user);
      toast.success("Welcome back", { description: "Your studio is ready." });
      router.push("/app/home");
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      form.setError("root", { message });
      toast.error("Cannot reach the API", { description: message });
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <AuthPageShell
      aside={
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">fotoz.io</p>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Continue project delivery with full team control</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            From helper uploads to client selections, access your operational flow in one secure studio.
          </p>
        </div>
      }
    >
      <Panel title="Sign In" subtitle="Return to your fotoz.io studio.">
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="identifier">Email or username</Label>
            <Input
              id="identifier"
              autoComplete="username"
              aria-invalid={!!form.formState.errors.identifier}
              aria-describedby="identifier-description"
              placeholder="studio-owner@fotoz.io"
              {...form.register("identifier")}
            />
            <p id="identifier-description" className="text-xs text-muted-foreground">
              Use your studio email address or your chosen username.
            </p>
            {form.formState.errors.identifier ? <p className="text-sm text-destructive">{form.formState.errors.identifier.message}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!form.formState.errors.password}
              placeholder="Enter your password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? <p className="text-sm text-destructive">{form.formState.errors.password.message}</p> : null}
          </div>

          {form.formState.errors.root ? <p className="text-sm text-destructive">{form.formState.errors.root.message}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            <span>{isSubmitting ? "Signing in..." : "Sign in to your studio"}</span>
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link className="underline decoration-border underline-offset-4 hover:text-foreground" href="/forgot-password">Reset your forgotten password</Link>
          <span className="text-muted-foreground">Don&apos;t have an account?</span>
          <Link className="underline decoration-border underline-offset-4 hover:text-foreground" href="/signup">Sign up for a new account</Link>
        </div>
      </Panel>
    </AuthPageShell>
  );
}
