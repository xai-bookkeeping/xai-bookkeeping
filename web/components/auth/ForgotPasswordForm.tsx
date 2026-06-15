"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PasswordStrength } from "@/components/ui/PasswordStrength";

type Step = "email" | "code" | "password" | "done";

function messageFrom(error: unknown) {
  if (!error) return "Password reset failed. Please try again.";
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Password reset failed. Please try again.";
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPending = fetchStatus === "fetching";

  function sendCode() {
    setError(null);
    void signIn.create({ identifier: email })
      .then(async ({ error }) => {
        if (error) {
          setError(messageFrom(error));
          return;
        }
        const result = await signIn.resetPasswordEmailCode.sendCode();
        if (result.error) setError(messageFrom(result.error));
        else setStep("code");
      })
      .catch((error) => setError(messageFrom(error)));
  }

  function verifyCode() {
    setError(null);
    void signIn.resetPasswordEmailCode.verifyCode({ code })
      .then(({ error }) => {
        if (error) setError(messageFrom(error));
        else setStep("password");
      })
      .catch((error) => setError(messageFrom(error)));
  }

  function submitPassword() {
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    void signIn.resetPasswordEmailCode.submitPassword({ password })
      .then(async ({ error }) => {
        if (error) {
          setError(messageFrom(error));
          return;
        }
        if (signIn.status === "complete") {
          await signIn.finalize({
            navigate: ({ decorateUrl }) => {
              const url = decorateUrl("/dashboard");
              if (url.startsWith("http")) window.location.href = url;
              else router.push(url);
            },
          });
        } else {
          setStep("done");
        }
      })
      .catch((error) => setError(messageFrom(error)));
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
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reset your password</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Clerk will send a one-time code to your work email.
        </p>
      </div>

      <div className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}
        {step === "done" ? (
          <Alert variant="success" title="Password updated">
            Your password has been reset. You can sign in with the new password.
          </Alert>
        ) : null}

        {step === "email" ? (
          <>
            <Input
              id="email"
              type="email"
              label="Work email"
              placeholder="reem@lumeninteriors.ae"
              autoComplete="email"
              autoFocus
              leftIcon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="button" fullWidth size="lg" loading={isPending} onClick={sendCode}>
              Send reset code
            </Button>
          </>
        ) : null}

        {step === "code" ? (
          <>
            <Alert variant="info">Enter the reset code sent to {email}.</Alert>
            <Input
              id="code"
              label="Reset code"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <Button type="button" fullWidth size="lg" loading={isPending} onClick={verifyCode}>
              Verify code
            </Button>
          </>
        ) : null}

        {step === "password" ? (
          <>
            <Input
              id="password"
              type="password"
              label="New password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {password ? <PasswordStrength password={password} /> : null}
            <Input
              id="confirmPassword"
              type="password"
              label="Confirm new password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <Button type="button" fullWidth size="lg" loading={isPending} onClick={submitPassword}>
              Update password
            </Button>
          </>
        ) : null}
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-sky-600 hover:underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
