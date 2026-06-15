"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth, useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

function messageFrom(error: unknown) {
  if (!error) return "Sign in failed. Please try again.";
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Sign in failed. Please try again.";
}

export function LoginForm() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signIn, fetchStatus } = useSignIn();
  const [serverError, setServerError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [needsEmailCode, setNeedsEmailCode] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false, selectedRole: "" },
  });

  const isPending = fetchStatus === "fetching";

  async function finalize(destination = "/dashboard") {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        const target = session?.currentTask ? `/sign-in/tasks/${session.currentTask.key}` : destination;
        const url = decorateUrl(target);
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
  }

  const onSubmit = (data: LoginFormData) => {
    setServerError(null);
    setNeedsEmailCode(false);
    if (isSignedIn) {
      router.replace("/dashboard");
      return;
    }

    void (async () => {
      const { error } = await signIn.password({
        emailAddress: data.email,
        password: data.password,
      });
      if (error) {
        setServerError(messageFrom(error));
        return;
      }
      if (signIn.status === "complete") {
        await finalize("/dashboard");
        return;
      }
      if (signIn.status === "needs_client_trust") {
        const { error: verificationError } = await signIn.mfa.sendEmailCode();
        if (verificationError) {
          setServerError(messageFrom(verificationError));
          return;
        }
        setNeedsEmailCode(true);
        return;
      }
      setServerError("Additional verification is required for this account.");
    })().catch((error) => setServerError(messageFrom(error)));
  };

  function handleGoogleSignIn() {
    setServerError(null);
    if (isSignedIn) {
      router.replace("/dashboard");
      return;
    }
    void signIn.sso({
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/dashboard",
      strategy: "oauth_google",
    }).then(({ error }) => {
      if (error) setServerError(messageFrom(error));
    }).catch((error) => setServerError(messageFrom(error)));
  }

  function verifyEmailCode() {
    setServerError(null);
    void (async () => {
      const { error } = await signIn.mfa.verifyEmailCode({ code: verificationCode });
      if (error) {
        setServerError(messageFrom(error));
        return;
      }
      if (signIn.status === "complete") await finalize("/dashboard");
    })().catch((error) => setServerError(messageFrom(error)));
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
        <p className="mt-1.5 text-sm text-slate-500">Sign in to your XAI Books workspace.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError ? <Alert variant="error">{serverError}</Alert> : null}

        <Button
          type="button"
          variant="secondary"
          fullWidth
          size="lg"
          loading={isPending}
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

        {needsEmailCode ? (
          <Input
            id="code"
            label="Verification code"
            inputMode="numeric"
            value={verificationCode}
            onChange={(event) => setVerificationCode(event.target.value)}
          />
        ) : null}

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

        {needsEmailCode ? (
          <Button type="button" fullWidth size="lg" loading={isPending} onClick={verifyEmailCode} className="mt-2">
            Verify code
          </Button>
        ) : (
          <Button type="submit" fullWidth size="lg" loading={isPending} className="mt-2">
            Sign in
          </Button>
        )}
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
    </div>
  );
}
