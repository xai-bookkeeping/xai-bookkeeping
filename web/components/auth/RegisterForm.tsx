"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Mail, User } from "lucide-react";
import { registerSchema, type RegisterFormData } from "@/lib/validations";
import { registerAction } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PasswordStrength } from "@/components/ui/PasswordStrength";

export function RegisterForm({ prefillEmail = "" }: { prefillEmail?: string }) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [watchedPassword, setWatchedPassword] = useState("");

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

  const onSubmit = (data: RegisterFormData) => {
    setServerError(null);
    startTransition(async () => {
      const result = await registerAction(data);
      if (result?.error) setServerError(result.error);
    });
  };

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
        {serverError && <Alert variant="error">{serverError}</Alert>}

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

        {watchedPassword && <PasswordStrength password={watchedPassword} />}

        <Input
          {...form.register("confirmPassword")}
          id="confirmPassword"
          type="password"
          label="Confirm password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={form.formState.errors.confirmPassword?.message}
        />

        <Button type="submit" fullWidth size="lg" loading={isPending} className="mt-2">
          Create workspace
        </Button>
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
