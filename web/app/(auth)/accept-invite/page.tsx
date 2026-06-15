import type { Metadata } from "next";
import Link from "next/link";
import { AcceptInvitationForm } from "@/components/auth/AcceptInvitationForm";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; token?: string }>;
}) {
  const params = await searchParams;
  const ticket = params.ticket ?? params.token ?? "";

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Accept your invitation
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Continue to activate your XAI Books account with Clerk.
        </p>
      </div>

      {ticket ? (
        <AcceptInvitationForm token={ticket} />
      ) : (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">Invitation unavailable</p>
          <p className="mt-1">This invitation link is missing a Clerk ticket.</p>
          <Link href="/login" className="mt-4 inline-block font-semibold text-red-800 underline">
            Back to sign in
          </Link>
        </div>
      )}
    </div>
  );
}
