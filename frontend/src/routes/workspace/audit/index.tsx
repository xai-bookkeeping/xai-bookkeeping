import { useQuery } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import { listAuditEventsApiV1CompaniesCompanyIdAuditEventsGet, type AuditEventListResponse } from "@/api";
import { AuditEventTable } from "@/components/organisms/audit-event-table";
import { PermissionDeniedState } from "@/components/organisms/permission-denied-state";
import { Card, CardContent } from "@/components/ui";
import { apiClient } from "@/lib/api-runtime";
import type { RootRouteContext } from "@/routes/root";

const auditQueryKey = (companyId: string) => ["company-audit", companyId] as const;

function getErrorMessage(error: unknown, companyName: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof error.detail === "string"
  ) {
    return error.detail;
  }

  return `You do not have permission to do that in ${companyName}.`;
}

export function AuditRoute() {
  const { activeCompany, companyShellState, openCompanySwitcher } = useOutletContext<RootRouteContext>();

  const auditQuery = useQuery({
    enabled: companyShellState === "ready" && Boolean(activeCompany),
    queryKey: activeCompany ? auditQueryKey(activeCompany.id) : ["company-audit", "missing"],
    queryFn: async () => {
      const response = await listAuditEventsApiV1CompaniesCompanyIdAuditEventsGet({
        client: apiClient,
        path: {
          company_id: activeCompany?.id ?? "",
        },
        responseStyle: "fields",
      });

      if ("error" in response && response.error) {
        if (response.response?.status === 403) {
          return {
            deniedMessage: getErrorMessage(response.error, activeCompany?.name ?? "this company"),
            events: [],
          };
        }

        throw response.error;
      }

      return {
        deniedMessage: null,
        events: (response.data as AuditEventListResponse).events,
      };
    },
  });

  if (companyShellState === "forbidden") {
    return <PermissionDeniedState onSwitchCompany={openCompanySwitcher} />;
  }

  if (companyShellState === "loading" || !activeCompany || auditQuery.isLoading || !auditQuery.data) {
    return (
      <Card className="border-dashed bg-[rgba(238,243,247,0.45)]">
        <CardContent className="p-6 text-sm text-[var(--xb-muted)]">
          Loading company audit history...
        </CardContent>
      </Card>
    );
  }

  return <AuditEventTable deniedMessage={auditQuery.data.deniedMessage} events={auditQuery.data.events} />;
}
