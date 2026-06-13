import { Link, Navigate } from "react-router-dom";

import { Badge, Card, CardContent } from "@/components/ui";
import { SignUp, useAuth } from "@/lib/clerk";

function ValuePill({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-medium text-slate-100">
      {label}
    </div>
  );
}

export function SignUpRoute() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return <Navigate replace to="/create-company" />;
  }

  return (
    <div className="min-h-dvh bg-[var(--xb-bg)] text-[var(--xb-ink)]">
      <div className="mx-auto grid min-h-dvh max-w-[1600px] min-[860px]:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-slate-950 px-10 py-12 text-white min-[860px]:flex min-[860px]:flex-col min-[860px]:justify-between xl:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.34),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.18),transparent_26%)]" />
          <div className="relative space-y-8">
            <Badge className="w-fit bg-white/10 text-slate-100" tone="default">
              XAI Books
            </Badge>
            <div className="max-w-xl space-y-5">
              <h1 className="text-4xl font-semibold tracking-tight xl:text-5xl">
                Start your UAE-first finance workspace with a secure company-private foundation.
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-300">
                Create your account, then continue into company setup so your workspace, team
                access, and audit trail all begin in the right place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ValuePill label="Google sign-up supported" />
              <ValuePill label="Company-private by default" />
              <ValuePill label="Audit-friendly foundation" />
            </div>
          </div>

          <div className="relative grid gap-4 md:grid-cols-2">
            <Card className="border-white/10 bg-white/6 text-white shadow-none">
              <CardContent className="space-y-2 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Setup flow
                </p>
                <p className="text-sm leading-6 text-slate-200">
                  Sign up first, then continue into company creation without bouncing through
                  provider-hosted recovery copy.
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/6 text-white shadow-none">
              <CardContent className="space-y-2 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Trust
                </p>
                <p className="text-sm leading-6 text-slate-200">
                  Clerk handles identity while XAI Books keeps the onboarding steps product-owned.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6 lg:px-10 xl:px-16">
          <div className="w-full max-w-[32rem] space-y-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--xb-muted)]">
                Sign up
              </p>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Create your account
                </h2>
                <p className="text-sm leading-6 text-[var(--xb-muted)]">
                  Use your work email or Google account to create access. We will keep you in
                  setup until your company workspace is ready.
                </p>
              </div>
            </div>

            <Card className="border-[color:var(--xb-border)] bg-white">
              <CardContent className="space-y-5 p-6 sm:p-8">
                <div className="rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-4 text-sm leading-6 text-[var(--xb-muted)]">
                  Create your account, then continue into company setup.
                </div>

                <SignUp
                  path="/sign-up"
                  routing="path"
                  fallbackRedirectUrl="/create-company"
                  forceRedirectUrl="/create-company"
                  signInUrl="/sign-in"
                />

                <div className="flex flex-col gap-3 border-t border-[color:var(--xb-border)] pt-5">
                  <Link
                    to="/sign-in"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--xb-border)] bg-white px-4 text-sm font-semibold text-[var(--xb-ink)] transition-colors hover:bg-slate-50"
                  >
                    I already have an account
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
