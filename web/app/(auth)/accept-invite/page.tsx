import type { Metadata } from "next";
import Link from "next/link";
import { validateInvitationAction } from "@/actions/auth";
import { AcceptInvitationForm } from "@/components/auth/AcceptInvitationForm";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  const result = token ? await validateInvitationAction(token) : { error: "Missing token." };
  const invite = result.data as
    | { email: string; firstName: string; lastName: string; role: string }
    | undefined;

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Accept your invitation
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Set your password to activate your XAI Books account.
        </p>
      </div>

      {result.error || !invite ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">Invitation unavailable</p>
          <p className="mt-1">{result.error ?? "This invitation link cannot be used."}</p>
          <Link href="/login" className="mt-4 inline-block font-semibold text-red-800 underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              {invite.firstName} {invite.lastName}
            </p>
            <p className="mt-1 text-sm text-slate-500">{invite.email}</p>
            <p className="mt-3 inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
              {invite.role}
            </p>
          </div>
          <AcceptInvitationForm token={token} />
        </div>
      )}
    </div>
  );
}
