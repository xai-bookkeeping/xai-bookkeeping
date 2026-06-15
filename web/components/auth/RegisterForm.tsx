"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth, useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, User } from "lucide-react";
import { registerSchema, type RegisterFormData } from "@/lib/validations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PasswordStrength } from "@/components/ui/PasswordStrength";

function messageFrom(error: unknown) {
  if (!error) return "Sign up failed. Please try again.";
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Sign up failed. Please try again.";
}

export function RegisterForm({ prefillEmail = "" }: { prefillEmail?: string }) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signUp, fetchStatus } = useSignUp();
  const [serverError, setServerError] = useState<string | null>(null);
  const [watchedPassword, setWatchedPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: prefillEmail,
      password: "",
      confirmPassword: "",
    },
  });

  const isPending = fetchStatus === "fetching";

  async function finalize() {
    await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        const target = session?.currentTask ? `/sign-up/tasks/${session.currentTask.key}` : "/onboarding";
        const url = decorateUrl(target);
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
  }

  const onSubmit = (data: RegisterFormData) => {
    setServerError(null);
    if (isSignedIn) {
      router.replace("/dashboard");
      return;
    }
    void (async () => {
      const { error } = await signUp.password({
        emailAddress: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      });
      if (error) {
        setServerError(messageFrom(error));
        return;
      }
      const { error: verificationError } = await signUp.verifications.sendEmailCode();
      if (verificationError) {
        setServerError(messageFrom(verificationError));
        return;
      }
      setIsVerifying(true);
    })().catch((error) => setServerError(messageFrom(error)));
  };

  function handleGoogleSignUp() {
    setServerError(null);
    if (isSignedIn) {
      router.replace("/dashboard");
      return;
    }
    void signUp.sso({
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/onboarding",
      strategy: "oauth_google",
    }).then(({ error }) => {
      if (error) setServerError(messageFrom(error));
    }).catch((error) => setServerError(messageFrom(error)));
  }

  function verifyCode() {
    setServerError(null);
    void (async () => {
      const { error } = await signUp.verifications.verifyEmailCode({ code: verificationCode });
      if (error) {
        setServerError(messageFrom(error));
        return;
      }
      if (signUp.status === "complete") await finalize();
    })().catch((error) => setServerError(messageFrom(error)));
  }

  return (
    <div className="w-full max-w-[440px]">
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-6 lg:hidden select-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-xs font-black text-white">
            XB
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">
            <span className="text-sky-500">X</span>AI Books
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create your workspace</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Set up your company on XAI Books in under a minute.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError ? <Alert variant="error">{serverError}</Alert> : null}

        {isVerifying ? (
          <>
            <Alert variant="info">Enter the verification code Clerk sent to your email.</Alert>
            <Input
              id="code"
              label="Verification code"
              inputMode="numeric"
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
            />
            <Button type="button" fullWidth size="lg" loading={isPending} onClick={verifyCode}>
              Verify and continue
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => {
                setServerError(null);
                void signUp.verifications
                  .sendEmailCode()
                  .then(({ error }) => {
                    if (error) setServerError(messageFrom(error));
                  })
                  .catch((error) => setServerError(messageFrom(error)));
              }}
            >
              Send another code
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              size="lg"
              loading={isPending}
              onClick={handleGoogleSignUp}
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

            <div className="grid grid-cols-2 gap-4">
              <Input
                {...form.register("firstName")}
                id="firstName"
                label="First name"
                placeholder="Reem"
                autoComplete="given-name"
                autoFocus
                leftIcon={<User className="h-4 w-4" />}
                error={form.formState.errors.firstName?.message}
              />
              <Input
                {...form.register("lastName")}
                id="lastName"
                label="Last name"
                placeholder="Al-Mansoori"
                autoComplete="family-name"
                leftIcon={<User className="h-4 w-4" />}
                error={form.formState.errors.lastName?.message}
              />
            </div>

            <Input
              {...form.register("email")}
              id="email"
              type="email"
              label="Work email"
              placeholder="reem@lumeninteriors.ae"
              autoComplete="email"
              leftIcon={<Mail className="h-4 w-4" />}
              error={form.formState.errors.email?.message}
            />

            <Input
              {...form.register("password", {
                onChange: (e) => setWatchedPassword(e.target.value),
              })}
              id="password"
              type="password"
              label="Password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              error={form.formState.errors.password?.message}
            />

            {watchedPassword ? <PasswordStrength password={watchedPassword} /> : null}

            <Input
              {...form.register("confirmPassword")}
              id="confirmPassword"
              type="password"
              label="Confirm password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={form.formState.errors.confirmPassword?.message}
            />

            <div id="clerk-captcha" />

            <Button type="submit" fullWidth size="lg" loading={isPending} className="mt-2">
              Create workspace
            </Button>
          </>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-sky-600 hover:text-sky-700 hover:underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
