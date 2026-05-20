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

const signupSchema = z.object({
  email: z.email("Enter a valid email address."),
  username: z.string().trim().min(2, "Use at least 2 characters.").max(64, "Keep the username under 64 characters.").optional().or(z.literal("")),
  studio_name: z.string().trim().min(2, "Enter your studio name.").max(120, "Keep the studio name under 120 characters."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Z]/, "Include at least one uppercase letter.")
    .regex(/[a-z]/, "Include at least one lowercase letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const baseUrl = apiBaseUrl();
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      username: "",
      studio_name: "",
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

  async function onSubmit(values: SignupValues) {
    try {
      const res = await fetch(`${baseUrl}/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, username: values.username || undefined }),
      });

      if (!res.ok) {
        const errorMessage = await parseError(res, `Signup failed (${res.status})`);
        if (errorMessage === "open signup disabled") {
          const message = "Self-signup is disabled in this environment. Ask an admin for an invite.";
          form.setError("root", { message });
          toast.error("Invite required", { description: message });
          return;
        }
        form.setError("root", { message: errorMessage });
        toast.error("Could not create account", { description: errorMessage });
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        verification_mode?: string;
        access_token?: string;
        user?: { email: string | null; username: string | null; roles: string[]; account_type: string; email_verified: boolean };
      };
      if (body.verification_mode === "self") {
        toast.success("Account created", { description: "Verify your email to activate the studio." });
        router.push("/verify-email");
        return;
      }
      if (body.access_token && body.user) {
        storeAccessToken(body.access_token);
        writeCachedUser(body.user);
        toast.success("Studio created", { description: "You are signed in and ready to continue." });
        router.push("/app/home");
        return;
      }
      toast.success("Account created", { description: "Your studio is waiting for verification." });
      router.push("/login");
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
          <h3 className="text-xl font-semibold">Onboarding Policy</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Self-signup creates a studio owner account and studio. Photographers and clients join through invites, while internal platform roles remain provisioned only.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The closed beta promise is simple: create a studio, upload one real project, share a secure gallery link or private review invite, and let the product earn trust from there.
          </p>
        </div>
      }
    >
      <Panel title="Create Account" subtitle="Create your studio owner account and launch your first fotoz.io studio.">
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              aria-describedby="email-description"
              placeholder="studio-owner@fotoz.io"
              {...form.register("email")}
            />
            <p id="email-description" className="text-xs text-muted-foreground">
              We&apos;ll use this address for account verification and studio notifications.
            </p>
            {form.formState.errors.email ? <p className="text-sm text-destructive">{form.formState.errors.email.message}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              aria-invalid={!!form.formState.errors.username}
              aria-describedby="username-description"
              placeholder="Optional studio label"
              {...form.register("username")}
            />
            <p id="username-description" className="text-xs text-muted-foreground">
              {form.formState.errors.username ? form.formState.errors.username.message : "Optional, but useful for naming your studio."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="studio_name">Studio name</Label>
            <Input
              id="studio_name"
              autoComplete="organization"
              aria-invalid={!!form.formState.errors.studio_name}
              aria-describedby="studio-name-description"
              placeholder="Sukumar Weddings"
              {...form.register("studio_name")}
            />
            <p id="studio-name-description" className="text-xs text-muted-foreground">
              {form.formState.errors.studio_name ? form.formState.errors.studio_name.message : "This is the name clients and team members will see."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.password}
              aria-describedby="password-description"
              placeholder="Create a strong password"
              {...form.register("password")}
            />
            <p id="password-description" className="text-xs text-muted-foreground">
              {form.formState.errors.password ? form.formState.errors.password.message : "Use at least 8 characters, including uppercase, lowercase, and a number."}
            </p>
          </div>

          {form.formState.errors.root ? <p className="text-sm text-destructive">{form.formState.errors.root.message}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            <span>{isSubmitting ? "Creating studio account..." : "Create studio account"}</span>
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <span className="text-muted-foreground">Invited photographers and clients join later through secure access links.</span>
          <span className="text-muted-foreground">Already have an account?</span>
          <Link className="underline decoration-border underline-offset-4 hover:text-foreground" href="/login">Sign in to your studio</Link>
        </div>
      </Panel>
    </AuthPageShell>
  );
}
