import { useState } from "react";
import { useAuth, useOrganization } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  getAuthBootstrapApiV1AuthBootstrapGet,
  getCompanyApiV1CompaniesCompanyIdGet,
  type CompanyResponse,
} from "@/api";
import { CompanySwitcher } from "@/components/molecules/company-switcher";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/components/ui";
import { apiClient } from "@/lib/api-runtime";
import { cn } from "@/lib/cn";

const navigation = [
  { end: true, label: "Workspace", to: "/workspace", tone: "accent" as const, status: "Open" },
  { label: "Company settings", to: "/workspace/settings", tone: "accent" as const, status: "Live" },
  { label: "Team & roles", to: "/workspace/team", tone: "accent" as const, status: "Live" },
  { label: "Activity & audit", to: "/workspace/audit", tone: "accent" as const, status: "Live" },
  { label: "Customers", status: "Planned" },
  { label: "Suppliers", status: "Planned" },
  { label: "VAT", status: "Planned" },
];

function ShellNavLink({
  end = false,
  to,
  children,
}: {
  end?: boolean;
  to: string;
  children: ReactNode;
}) {
  return (
    <NavLink
      end={end}
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
          isActive
            ? "bg-[color:var(--xb-accent-soft)] text-[var(--xb-ink)]"
            : "text-[var(--xb-muted)] hover:bg-slate-50 hover:text-[var(--xb-ink)]",
        )
      }
    >
      {children}
    </NavLink>
  );
}

type CompanyShellState = "forbidden" | "loading" | "ready" | "setup";

type CompanyLookupState =
  | {
      company: CompanyResponse;
      kind: "ready";
    }
  | {
      kind: "forbidden";
    };

function getOrganizationBusinessActivity(publicMetadata: unknown): string | null {
  if (typeof publicMetadata !== "object" || publicMetadata === null) {
    return null;
  }

  const metadata = publicMetadata as { businessActivity?: unknown };

  return typeof metadata.businessActivity === "string" ? metadata.businessActivity : null;
}

export type RootRouteContext = {
  activeCompany: CompanyResponse | null;
  companyShellState: CompanyShellState;
  isSwitchingCompany: boolean;
  openCompanySwitcher: () => void;
  retryCompanyAccess: () => void;
};

export function RootRoute() {
  const { isLoaded, orgId } = useAuth();
  const { organization } = useOrganization();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companySwitcherOpen, setCompanySwitcherOpen] = useState(false);
  const [isSwitchingCompany, setIsSwitchingCompany] = useState(false);

  const bootstrapQuery = useQuery({
    enabled: isLoaded && Boolean(orgId),
    queryKey: ["auth-bootstrap", orgId],
    queryFn: async () => {
      const response = await getAuthBootstrapApiV1AuthBootstrapGet({
        client: apiClient,
        responseStyle: "fields",
      });

      if ("error" in response && response.error) {
        throw response.error;
      }

      return response.data ?? null;
    },
    staleTime: 5_000,
  });

  const bootstrapStatus = bootstrapQuery.data?.status;
  const organizationBusinessActivity = getOrganizationBusinessActivity(organization?.publicMetadata);
  const organizationName = organization?.name ?? null;
  const activeCompanyId = bootstrapQuery.data?.active_organization_id ?? orgId ?? null;
  const shouldQueryActiveCompany = bootstrapStatus === "ready" && Boolean(activeCompanyId);

  const activeCompanyQuery = useQuery<CompanyLookupState>({
    enabled: shouldQueryActiveCompany,
    queryKey: ["active-company", activeCompanyId],
    queryFn: async () => {
      const response = await getCompanyApiV1CompaniesCompanyIdGet({
        client: apiClient,
        path: {
          company_id: activeCompanyId ?? "",
        },
        responseStyle: "fields",
      });

      if ("error" in response && response.error) {
        if (response.response?.status === 403 || response.response?.status === 404) {
          return { kind: "forbidden" } as const;
        }

        throw response.error;
      }

      return {
        kind: "ready",
        company: response.data as CompanyResponse,
      } as const;
    },
    staleTime: 5_000,
  });

  const companyShellState: CompanyShellState = (() => {
    if (isSwitchingCompany || !isLoaded || !orgId || bootstrapQuery.isLoading || bootstrapQuery.isFetching) {
      return "loading";
    }

    if (bootstrapStatus === "no_active_company" || bootstrapStatus === "company_context_pending") {
      return "setup";
    }

    if (activeCompanyQuery.data?.kind === "forbidden") {
      return "forbidden";
    }

    if (activeCompanyQuery.data?.kind === "ready") {
      return "ready";
    }

    if (activeCompanyQuery.isLoading || activeCompanyQuery.isFetching) {
      return "loading";
    }

    return "loading";
  })();

  const activeCompany =
    companyShellState === "ready" && activeCompanyQuery.data?.kind === "ready"
      ? activeCompanyQuery.data.company
      : null;

  const activeCompanyName =
    activeCompany?.name ??
    organizationName ??
    (companyShellState === "forbidden"
      ? "Company access unavailable"
      : companyShellState === "setup"
        ? "Preparing company workspace"
        : "Loading company context");
  const activeCompanySubtitle =
    activeCompany?.slug
      ? activeCompany.slug.replaceAll("-", " ")
      : companyShellState === "forbidden"
        ? "Switch to an authorized company or ask an admin for access."
        : companyShellState === "setup"
          ? "We are confirming your company setup before opening the workspace."
          : organizationBusinessActivity ?? "UAE company workspace";
  const companyBadge =
    companyShellState === "forbidden"
      ? { label: "Denied", tone: "warning" as const }
      : companyShellState === "setup"
        ? { label: "Setup", tone: "accent" as const }
      : companyShellState === "loading"
        ? { label: "Loading", tone: "default" as const }
        : { label: "Live", tone: "success" as const };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--xb-bg)] text-[var(--xb-ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.05),transparent_24%)]" />

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-20 cursor-default bg-slate-950/35 backdrop-blur-[2px] xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="relative mx-auto flex min-h-dvh max-w-[1600px]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-[264px] border-r border-[color:var(--xb-border)] bg-white/95 px-5 py-6 shadow-[var(--xb-shadow)] backdrop-blur transition-transform duration-300 xl:static xl:z-auto xl:translate-x-0 xl:shadow-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0",
          )}
        >
          <div className="flex h-full flex-col gap-6">
            <div className="flex items-center justify-between">
              <Link to="/workspace" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--xb-accent)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.2)]">
                  XB
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-tight">XAI Books</div>
                  <div className="text-xs text-[var(--xb-muted)]">UAE SME finance</div>
                </div>
              </Link>
              <button
                type="button"
                aria-label="Close navigation"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--xb-border)] text-[var(--xb-muted)] hover:bg-slate-50 xl:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--xb-muted)]">
                Company
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{activeCompanyName}</div>
                  <div className="text-xs text-[var(--xb-muted)]">{activeCompanySubtitle}</div>
                </div>
                <Badge tone={companyBadge.tone}>{companyBadge.label}</Badge>
              </div>
            </div>

            <nav className="space-y-1">
              {navigation.map((item) => (
                "to" in item ? (
                  <ShellNavLink key={item.label} end={"end" in item ? item.end : false} to={item.to}>
                    <span>{item.label}</span>
                    <Badge tone={item.tone === "accent" ? "accent" : "default"}>{item.status}</Badge>
                  </ShellNavLink>
                ) : (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-[var(--xb-muted)]"
                  >
                    <span>{item.label}</span>
                    <Badge tone="default">{item.status}</Badge>
                  </div>
                )
              ))}
            </nav>

            <div className="mt-auto rounded-[1.25rem] border border-[color:var(--xb-border)] bg-white p-4">
              <p className="text-sm font-semibold">Ready for contract generation</p>
              <p className="mt-2 text-sm leading-6 text-[var(--xb-muted)]">
                The generated API client will be committed and consumed from the browser without a
                shared runtime package.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-[color:var(--xb-border)] bg-white/90 backdrop-blur">
            <div className="flex h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
              <button
                type="button"
                aria-label="Open navigation"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--xb-border)] bg-white text-[var(--xb-muted)] shadow-sm hover:bg-slate-50 xl:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <span aria-hidden="true">☰</span>
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--xb-muted)]">
                  XAI Books workspace
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                    Run your business finances with confidence.
                  </h1>
                  <Badge tone="success">VAT handled automatically</Badge>
                </div>
              </div>

              <div className="hidden min-w-0 max-w-[28rem] flex-1 lg:block">
                <Input aria-label="Search workspace" placeholder="Search workspace, customers, invoices..." />
              </div>

              <CompanySwitcher
                activeCompanyId={activeCompany?.id ?? orgId ?? null}
                activeCompanyName={activeCompanyName}
                activeCompanySubtitle={activeCompanySubtitle}
                isOpen={companySwitcherOpen}
                onOpenChange={setCompanySwitcherOpen}
                onSwitchingChange={setIsSwitchingCompany}
              />
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
              <div className="min-w-0">
                <Outlet
                  context={{
                    activeCompany,
                    companyShellState,
                    isSwitchingCompany,
                    openCompanySwitcher: () => setCompanySwitcherOpen(true),
                    retryCompanyAccess: () => {
                      void bootstrapQuery.refetch();
                    },
                  } satisfies RootRouteContext}
                />
              </div>

              <aside className="space-y-6">
                <Card>
                  <CardHeader>
                    <Badge tone="accent" className="w-fit">
                      Backend probe area
                    </Badge>
                    <CardTitle>Reserved for live API status</CardTitle>
                    <CardDescription>
                      This panel is where the workspace route will show the backend health and the
                      latest probe result.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm leading-6 text-[var(--xb-muted)]">
                    <p>Generated client code will come from FastAPI OpenAPI output.</p>
                    <p>TanStack Query will own the refresh and mutation lifecycle.</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Shell contract</CardTitle>
                    <CardDescription>
                      Sidebar, top bar, and route-owned screen composition are locked in place.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-[var(--xb-muted)]">
                    <p>Light theme by default.</p>
                    <p>Dense layouts with tabular data support.</p>
                    <p>Atomic reusable UI stays in the component folders.</p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
