"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validations";
import { resetPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PasswordStrength } from "@/components/ui/PasswordStrength";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [watchedPassword, setWatchedPassword] = useState("");

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "", token },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    setServerError(null);
    startTransition(async () => {
      const result = await resetPasswordAction(data);
      if (result?.error) {
        setServerError(result.error);
      } else {
        setSuccess(true);
      }
    });
  };

  if (success) {
    return (
      <div className="w-full max-w-[400px] space-y-6">
        <Alert variant="success" title="Password updated">
          Your password has been reset successfully.
        </Alert>
        <Link
          href="/login"
          className="block w-full rounded-xl bg-sky-500 py-3 text-center text-sm font-semibold text-white hover:bg-sky-600 transition-colors"
        >
          Sign in with new password
        </Link>
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
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Choose a new password</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Your new password must be strong and different from your previous one.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <input type="hidden" {...form.register("token")} value={token} />

        <Input
          {...form.register("password", {
            onChange: (e) => setWatchedPassword(e.target.value),
          })}
          id="password"
          type="password"
          label="New password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          autoFocus
          error={form.formState.errors.password?.message}
        />

        {watchedPassword && <PasswordStrength password={watchedPassword} />}

        <Input
          {...form.register("confirmPassword")}
          id="confirmPassword"
          type="password"
          label="Confirm new password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={form.formState.errors.confirmPassword?.message}
        />

        <Button type="submit" fullWidth size="lg" loading={isPending}>
          Update password
        </Button>
      </form>
    </div>
  );
}
