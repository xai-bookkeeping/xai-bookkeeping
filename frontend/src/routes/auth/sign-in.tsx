import { Link, Navigate } from "react-router-dom";

import { Badge, Card, CardContent } from "@/components/ui";
import { SignIn, useAuth } from "@/lib/clerk";

function ValuePill({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-medium text-slate-100">
      {label}
    </div>
  );
}

export function SignInRoute() {
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
                Run your business finances with confidence.
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-300">
                Invoices, payments, VAT and cashflow - in one simple, UAE-first system. Built for
                owners, trusted by accountants.
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
                  Simple
                </p>
                <p className="text-sm leading-6 text-slate-200">
                  Keep the sign-in flow calm and direct, with product-owned next steps.
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/6 text-white shadow-none">
              <CardContent className="space-y-2 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Trust
                </p>
                <p className="text-sm leading-6 text-slate-200">
                  Clerk sessions stay cookie-based while the backend keeps company context typed.
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
                  Welcome back
                </h2>
                <p className="text-sm leading-6 text-[var(--xb-muted)]">
                  Sign in to your XAI Books workspace.
                </p>
              </div>
            </div>

            <Card className="border-[color:var(--xb-border)] bg-white">
              <CardContent className="space-y-5 p-6 sm:p-8">
                <div className="rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-4 text-sm leading-6 text-[var(--xb-muted)]">
                  Your session expired. Sign in again to continue.
                </div>

                <div className="rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-4 text-sm leading-6 text-[var(--xb-muted)]">
                  New here? Create a company workspace and we will keep you in setup until the
                  backend says it is ready.
                </div>

                <SignIn
                  path="/sign-in"
                  routing="path"
                  fallbackRedirectUrl="/create-company"
                  forceRedirectUrl="/create-company"
                  signUpUrl="/sign-up"
                  transferable={false}
                  withSignUp={false}
                />

                <div className="flex flex-col gap-3 border-t border-[color:var(--xb-border)] pt-5">
                  <Link
                    to="/sign-up"
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
