"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Mail } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations";
import { forgotPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    setServerError(null);
    startTransition(async () => {
      const result = await forgotPasswordAction(data);
      if (result?.error) {
        setServerError(result.error);
      } else {
        setSentEmail(data.email);
        setSent(true);
      }
    });
  };

  if (sent) {
    return (
      <div className="w-full max-w-[400px]">
        <div className="mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 mb-6">
            <Mail className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Check your inbox</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            If an account exists for{" "}
            <strong className="font-semibold text-slate-700">{sentEmail}</strong>, we&apos;ve sent
            a password reset link. It expires in 1 hour.
          </p>
        </div>
        <Alert variant="info">
          Didn&apos;t receive it? Check your spam folder or{" "}
          <button
            type="button"
            onClick={() => { setSent(false); form.reset(); }}
            className="font-semibold underline underline-offset-2"
          >
            try again
          </button>
          .
        </Alert>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="font-semibold text-sky-600 hover:underline underline-offset-2">
            ← Back to sign in
          </Link>
        </p>
      </div>
    );
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
          Enter your work email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <Alert variant="error">{serverError}</Alert>}

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

        <Button type="submit" fullWidth size="lg" loading={isPending}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-sky-600 hover:underline underline-offset-2">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
