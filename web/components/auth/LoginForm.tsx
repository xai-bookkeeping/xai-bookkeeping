"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Mail } from "lucide-react";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { googleSignInAction, loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();
  const [serverError, setServerError] = useState<{ message: string; code?: string } | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resentSuccess, setResentSuccess] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false, selectedRole: "" },
  });
  const email = form.watch("email");

  useEffect(() => {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setRoles([]);
      form.setValue("selectedRole", "");
      return;
    }

    const timer = window.setTimeout(async () => {
      setRolesLoading(true);
      try {
        const response = await fetch(`/api/auth/roles?email=${encodeURIComponent(normalizedEmail)}`);
        const body = await response.json().catch(() => ({ roles: [] }));
        const nextRoles = Array.isArray(body.roles) ? body.roles : [];
        setRoles(nextRoles);
        form.setValue("selectedRole", nextRoles[0] ?? "");
      } finally {
        setRolesLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [email, form]);

  const onSubmit = (data: LoginFormData) => {
    setServerError(null);
    setUnverifiedEmail(null);

    startTransition(async () => {
      const result = await loginAction(data);
      if (result?.error) {
        setServerError({ message: result.error, code: result.code });
        if (result.code === "email_not_verified") {
          setUnverifiedEmail(data.email);
        }
      }
    });
  };

  function handleGoogleSignIn() {
    setServerError(null);
    setUnverifiedEmail(null);
    startGoogleTransition(async () => {
      const result = await googleSignInAction();
      if (result?.error) setServerError({ message: result.error, code: result.code });
    });
  }

  async function handleResend() {
    if (!unverifiedEmail) return;
    setResendPending(true);
    const { resendVerificationAction } = await import("@/actions/auth");
    await resendVerificationAction(unverifiedEmail);
    setResendPending(false);
    setResentSuccess(true);
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6 lg:hidden select-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-xs font-black text-white">
            XB
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">
            <span className="text-sky-500">X</span>AI Books
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Sign in to your XAI Books workspace.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && serverError.code !== "email_not_verified" && (
          <Alert variant="error">{serverError.message}</Alert>
        )}

        {serverError?.code === "email_not_verified" && (
          <Alert
            variant="warning"
            title="Email not verified"
            action={
              resentSuccess ? (
                <p className="text-xs font-medium text-emerald-700">Verification email sent!</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendPending}
                  className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 disabled:opacity-60"
                >
                  {resendPending ? "Sending…" : "Resend verification email"}
                </button>
              )
            }
          >
            {serverError.message}
          </Alert>
        )}

        <Button
          type="button"
          variant="secondary"
          fullWidth
          size="lg"
          loading={isGooglePending}
          onClick={handleGoogleSignIn}
          className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-sm font-bold text-slate-900">
            G
          </span>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <Input
          {...form.register("email")}
          id="email"
          type="email"
          label="Work email"
          placeholder="reem@lumeninteriors.ae"
          autoComplete="email"
          autoFocus
          leftIcon={<Mail className="h-4 w-4" />}
          error={form.formState.errors.email?.message}
        />

        <Input
          {...form.register("password")}
          id="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
        />

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Login As</span>
          <select
            {...form.register("selectedRole")}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
            disabled={rolesLoading || roles.length === 0}
          >
            {roles.length === 0 ? (
              <option value="">{rolesLoading ? "Loading roles..." : "Enter email to load roles"}</option>
            ) : (
              roles.map((role) => <option key={role} value={role}>{role}</option>)
            )}
          </select>
          <span className="block text-xs text-slate-400">
            Only roles assigned to this user are shown.
          </span>
        </label>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              {...form.register("remember")}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-sky-500 accent-sky-500"
            />
            Keep me signed in
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline underline-offset-2"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={isPending} className="mt-2">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New to XAI Books?{" "}
        <Link
          href="/register"
          className="font-semibold text-sky-600 hover:text-sky-700 hover:underline underline-offset-2"
        >
          Create a workspace
        </Link>
      </p>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <span>🌐</span> English (UAE) · العربية coming soon
      </p>
    </div>
  );
}
