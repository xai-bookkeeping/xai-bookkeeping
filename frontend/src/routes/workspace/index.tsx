import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  createWorkspaceProbeWorkspaceProbePost as createWorkspaceProbe,
  getHealthHealthGet as getHealth,
  getLatestWorkspaceProbeWorkspaceProbeLatestGet as getLatestWorkspaceProbe,
  type HealthResponse,
  type WorkspaceProbeResponse,
} from "@/api";
import { PermissionDeniedState } from "@/components/organisms/permission-denied-state";
import { apiClient } from "@/lib/api-runtime";
import type { RootRouteContext } from "@/routes/root";
const latestProbeQueryKey = ["workspace-probe", "latest"] as const;

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getHealthBadgeTone(health?: HealthResponse): "success" | "warning" | "default" {
  if (!health) {
    return "warning";
  }

  return health.database.configured ? "success" : "warning";
}

function getProbeLabel(probe: WorkspaceProbeResponse | null | undefined): string {
  if (!probe) {
    return "No workspace probe yet";
  }

  return `Completed at ${formatDateTime(probe.updated_at)}`;
}

export function WorkspaceRoute() {
  const { activeCompany, companyShellState, isSwitchingCompany, openCompanySwitcher } =
    useOutletContext<RootRouteContext>();
  const queryClient = useQueryClient();

  const healthQuery = useQuery({
    enabled: companyShellState === "ready",
    queryKey: ["workspace-health"],
    queryFn: async () =>
      getHealth({
        client: apiClient,
        responseStyle: "data",
        throwOnError: true,
      }),
    staleTime: 10_000,
  });

  const latestProbeQuery = useQuery({
    enabled: companyShellState === "ready",
    queryKey: latestProbeQueryKey,
    queryFn: async () => {
      const response = await getLatestWorkspaceProbe({
        client: apiClient,
        responseStyle: "fields",
      });

      if ("error" in response && response.error) {
        if (response.response?.status === 404) {
          return null;
        }

        throw response.error;
      }

      return response.data ?? null;
    },
    staleTime: 5_000,
  });

  const probeMutation = useMutation({
    mutationFn: async () =>
      createWorkspaceProbe({
        client: apiClient,
        responseStyle: "data",
        throwOnError: true,
        body: {
          source: "workspace-shell",
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: latestProbeQueryKey });
    },
  });

  const latestProbe = latestProbeQuery.data;
  const health = healthQuery.data;

  if (companyShellState === "forbidden") {
    return <PermissionDeniedState onSwitchCompany={openCompanySwitcher} />;
  }

  if (companyShellState === "loading" || isSwitchingCompany || !activeCompany) {
    return (
      <Card className="border-dashed bg-[rgba(238,243,247,0.45)]">
        <CardContent className="space-y-3 p-6">
          <Badge tone="accent" className="w-fit">
            Switching company...
          </Badge>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Loading company context</h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--xb-muted)]">
              We are refreshing your workspace and clearing company-scoped data before the next
              company renders.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--xb-muted)]">
            Workspace
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Workspace probe</h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--xb-muted)]">
              Use one action to check the live backend contract for {activeCompany.name} and
              refresh the latest probe result through the generated TypeScript client.
            </p>
          </div>
        </div>

        <Button
          onClick={() => probeMutation.mutate()}
          disabled={probeMutation.isPending}
        >
          {probeMutation.isPending ? "Running probe..." : "Run Workspace Probe"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Badge tone={getHealthBadgeTone(health)} className="w-fit">
              {healthQuery.isLoading ? "Checking API" : health?.status === "ok" ? "API healthy" : "API unavailable"}
            </Badge>
            <CardTitle>System status</CardTitle>
            <CardDescription>
              Health and database readiness loaded through the generated backend contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[var(--xb-muted)]">Company</span>
                <span className="font-semibold text-[var(--xb-ink)]">{activeCompany.name}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[var(--xb-muted)]">API status</span>
                <span className="font-semibold text-[var(--xb-ink)]">
                  {healthQuery.isLoading ? "Loading..." : health?.status === "ok" ? "Healthy" : "Unavailable"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[var(--xb-muted)]">Database</span>
                <span className="font-semibold text-[var(--xb-ink)]">
                  {healthQuery.isLoading
                    ? "Loading..."
                    : health?.database.configured
                      ? `Configured (${health.database.driver ?? "unknown"})`
                      : "Not configured"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[var(--xb-muted)]">Environment</span>
                <span className="font-semibold text-[var(--xb-ink)]">
                  {healthQuery.isLoading ? "Loading..." : health?.application.environment ?? "Unknown"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge tone={latestProbe ? "success" : "default"} className="w-fit">
              {latestProbe ? "Latest probe loaded" : latestProbeQuery.isLoading ? "Loading latest probe" : "No latest probe"}
            </Badge>
            <CardTitle>Latest probe</CardTitle>
            <CardDescription>
              The probe result refreshes after the POST action succeeds and the latest GET query
              is invalidated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestProbe ? (
              <div className="grid gap-3 rounded-[1.25rem] border border-[color:var(--xb-border)] bg-white p-4 text-sm">
                <p className="font-medium text-[var(--xb-ink)]">{getProbeLabel(latestProbe)}</p>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[var(--xb-muted)]">Probe status</span>
                  <span className="font-semibold text-[var(--xb-ink)]">{latestProbe.status}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[var(--xb-muted)]">Source</span>
                  <span className="font-semibold text-[var(--xb-ink)]">{latestProbe.source}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[var(--xb-muted)]">Recorded</span>
                  <span className="font-semibold text-[var(--xb-ink)]">
                    {formatDateTime(latestProbe.updated_at)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[var(--xb-muted)]">Record ID</span>
                  <span className="font-semibold text-[var(--xb-ink)]">#{latestProbe.id}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-5">
                <p className="text-sm font-semibold text-[var(--xb-ink)]">
                  No workspace probe yet
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--xb-muted)]">
                  Run the probe action to create the first backend-backed record and refresh this
                  panel with the latest result.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed bg-[rgba(238,243,247,0.45)]">
        <CardContent className="space-y-2 p-5">
          <p className="text-sm font-semibold text-[var(--xb-ink)]">Owner-first flow</p>
          <p className="text-sm leading-6 text-[var(--xb-muted)]">
            This screen proves the frontend is consuming committed generated API contracts rather
            than browser-owned business logic.
          </p>
          <p className="text-sm leading-6 text-[var(--xb-muted)]">
            Generated output lives under <code>frontend/src/api/</code> and the button above calls
            the real POST probe endpoint through TanStack Query.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
