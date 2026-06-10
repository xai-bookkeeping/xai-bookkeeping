import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLeft } from "@/components/auth/AuthLeft";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { validatePasswordResetToken } from "@/lib/tokens";
import { Alert } from "@/components/ui/Alert";
import Link from "next/link";

export const metadata: Metadata = { title: "Choose new password" };

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) redirect("/forgot-password");

  const isValid = await validatePasswordResetToken(token);

  return (
    <>
      <AuthLeft
        headline="Choose a strong new password."
        subline="Your new password must meet our security requirements to protect your financial data."
        features={[
          { text: "At least 8 characters long" },
          { text: "Mix of uppercase and lowercase letters" },
          { text: "At least one number and special character" },
        ]}
      />
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        {isValid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="w-full max-w-[400px] space-y-6">
            <Alert variant="error" title="Link expired or invalid">
              This password reset link has expired or already been used. Reset links are valid for 1
              hour.
            </Alert>
            <Link
              href="/forgot-password"
              className="block w-full rounded-xl bg-sky-500 py-3 text-center text-sm font-semibold text-white hover:bg-sky-600 transition-colors"
            >
              Request a new reset link
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
