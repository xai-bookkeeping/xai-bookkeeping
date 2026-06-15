import type { Metadata } from "next";
import Link from "next/link";
import { AuthLeft } from "@/components/auth/AuthLeft";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <>
      <AuthLeft
        headline="Verify your email in the sign-up form."
        subline="XAI Books now uses Clerk verification codes instead of local verification links."
      />
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[400px] space-y-6">
          <Alert variant="info" title="Use your latest code">
            Return to registration and enter the one-time code Clerk sent to your email.
          </Alert>
          <Link
            href="/register"
            className="block w-full rounded-xl bg-sky-500 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-sky-600"
          >
            Back to registration
          </Link>
        </div>
      </div>
    </>
  );
}
