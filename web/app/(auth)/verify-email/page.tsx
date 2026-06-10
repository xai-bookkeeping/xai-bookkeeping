import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifyEmailAction, resendVerificationAction } from "@/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { AuthLeft } from "@/components/auth/AuthLeft";

export const metadata: Metadata = { title: "Verify email" };

interface Props {
  searchParams: Promise<{ token?: string; sent?: string; email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token, sent, email } = await searchParams;

  // Sent=true means we just registered and are waiting for the user to click the link
  if (sent === "true" && !token) {
    return (
      <>
        <AuthLeft
          headline="One last step — verify your email."
          subline="We've sent a verification link to your work email. Click it to activate your account."
          features={[
            { text: "Verification links expire after 24 hours" },
            { text: "Check your spam folder if you don't see it" },
            { text: "You can request a new link below" },
          ]}
        />
        <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 mb-6">
                <svg className="h-8 w-8 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Check your inbox</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                We sent a verification link to{" "}
                {email ? <strong className="font-semibold text-slate-700">{email}</strong> : "your email address"}.
                Click the link to activate your XAI Books account.
              </p>
            </div>
            <Alert variant="info">
              Didn&apos;t receive it?{" "}
              {email && (
                <form action={async () => { "use server"; await resendVerificationAction(email); }}>
                  <button type="submit" className="font-semibold underline underline-offset-2">
                    Resend verification email
                  </button>
                </form>
              )}
            </Alert>
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link href="/login" className="font-semibold text-sky-600 hover:underline underline-offset-2">
                ← Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  // Token present — process verification
  if (!token) redirect("/login");

  const result = await verifyEmailAction(token);

  return (
    <>
      <AuthLeft
        headline="Welcome to XAI Books."
        subline="Your account is now active and ready to use."
      />
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[400px] space-y-6">
          {result.error ? (
            <>
              <Alert variant="error" title="Verification failed">
                {result.error}
              </Alert>
              <Link
                href="/login"
                className="block w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <Alert variant="success" title="Email verified!">
                Your account is now active. You can sign in and start using XAI Books.
              </Alert>
              <Link
                href="/login"
                className="block w-full rounded-xl bg-sky-500 py-3 text-center text-sm font-semibold text-white hover:bg-sky-600 transition-colors"
              >
                Sign in to your workspace
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
