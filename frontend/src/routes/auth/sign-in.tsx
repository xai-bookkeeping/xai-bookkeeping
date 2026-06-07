import { Link, Navigate } from "react-router-dom";
import { SignIn, useAuth } from "@clerk/react";
import { Badge, Card, CardContent } from "@/components/ui";

function ValuePill({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-medium text-slate-100">
      {label}
    </div>
  );
}

export function SignInRoute() {
  const { isLoaded, isSignedIn, orgId } = useAuth();

  if (isLoaded && isSignedIn) {
    return <Navigate replace to={orgId ? "/workspace" : "/create-company"} />;
  }

  return (
    <div className="min-h-dvh bg-[var(--xb-bg)] text-[var(--xb-ink)]">
      <div className="mx-auto grid min-h-dvh max-w-[1600px] lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.34),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.18),transparent_26%)]" />
          <div className="relative space-y-8">
            <Badge className="w-fit bg-white/10 text-slate-100" tone="default">
              XAI Books
            </Badge>
            <div className="max-w-xl space-y-5">
              <h1 className="text-4xl font-semibold tracking-tight xl:text-5xl">
                Keep every company payment, approval, and VAT decision in one calm place.
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-300">
                Built for UAE operators who need clean records, visible controls, and less admin
                drag before the real finance work even starts.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ValuePill label="5% UAE VAT-ready" />
              <ValuePill label="Company-private by default" />
              <ValuePill label="Audit-friendly foundation" />
            </div>
          </div>

          <div className="relative grid gap-4 md:grid-cols-2">
            <Card className="border-white/10 bg-white/6 text-white shadow-none">
              <CardContent className="space-y-2 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Daily loop
                </p>
                <p className="text-sm leading-6 text-slate-200">
                  Move from sign-in to workspace setup without losing the owner-first simplicity.
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/6 text-white shadow-none">
              <CardContent className="space-y-2 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Trust
                </p>
                <p className="text-sm leading-6 text-slate-200">
                  Clerk sessions stay cookie-based while backend routes stay typed and guarded.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6 lg:px-10 xl:px-16">
          <div className="w-full max-w-[32rem] space-y-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--xb-muted)]">
                Sign in
              </p>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Welcome back to your finance workspace.
                </h2>
                <p className="text-sm leading-6 text-[var(--xb-muted)]">
                  Use your work email to continue. If your session expired, sign in again to pick
                  up right where you left off.
                </p>
              </div>
            </div>

            <Card className="border-[color:var(--xb-border)] bg-white">
              <CardContent className="space-y-5 p-6 sm:p-8">
                <div className="rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-4 text-sm leading-6 text-[var(--xb-muted)]">
                  Your session expired. Sign in again to continue.
                </div>

                <SignIn
                  path="/sign-in"
                  routing="path"
                  fallbackRedirectUrl="/workspace"
                  forceRedirectUrl="/workspace"
                  signUpForceRedirectUrl="/create-company"
                />

                <div className="flex flex-col gap-3 border-t border-[color:var(--xb-border)] pt-5">
                  <Link
                    to="/create-company"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--xb-border)] bg-white px-4 text-sm font-semibold text-[var(--xb-ink)] transition-colors hover:bg-slate-50"
                  >
                    Create a company workspace
                  </Link>
                  <p className="text-center text-xs text-[var(--xb-muted)]">
                    English (UAE) - Arabic coming soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
