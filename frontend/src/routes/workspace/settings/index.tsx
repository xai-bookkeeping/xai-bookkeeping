import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import {
  getCompanySettingsApiV1CompaniesCompanyIdSettingsGet,
  updateCompanySettingsApiV1CompaniesCompanyIdSettingsPatch,
  type CompanySettingsResponse,
  type CompanySettingsUpdateRequest,
} from "@/api";
import { CompanySetupRequiredState } from "@/components/organisms/company-setup-required-state";
import { CompanySettingsForm } from "@/components/organisms/company-settings-form";
import { PermissionDeniedState } from "@/components/organisms/permission-denied-state";
import { Card, CardContent } from "@/components/ui";
import { apiClient } from "@/lib/api-runtime";
import type { RootRouteContext } from "@/routes/root";

const settingsQueryKey = (companyId: string) => ["company-settings", companyId] as const;

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

export function CompanySettingsRoute() {
  const { activeCompany, companyShellState, openCompanySwitcher, retryCompanyAccess } =
    useOutletContext<RootRouteContext>();
  const queryClient = useQueryClient();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const settingsQuery = useQuery({
    enabled: companyShellState === "ready" && Boolean(activeCompany),
    queryKey: activeCompany ? settingsQueryKey(activeCompany.id) : ["company-settings", "missing"],
    queryFn: async () => {
      const response = await getCompanySettingsApiV1CompaniesCompanyIdSettingsGet({
        client: apiClient,
        path: {
          company_id: activeCompany?.id ?? "",
        },
        responseStyle: "fields",
      });

      if ("error" in response && response.error) {
        throw response.error;
      }

      return response.data as CompanySettingsResponse;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: CompanySettingsUpdateRequest) => {
      const response = await updateCompanySettingsApiV1CompaniesCompanyIdSettingsPatch({
        body,
        client: apiClient,
        path: {
          company_id: activeCompany?.id ?? "",
        },
        responseStyle: "fields",
      });

      if ("error" in response && response.error) {
        throw response.error;
      }

      return response.data as CompanySettingsResponse;
    },
    onSuccess: async () => {
      setFeedbackMessage("Company settings saved.");
      await queryClient.invalidateQueries({
        queryKey: settingsQueryKey(activeCompany?.id ?? ""),
      });
    },
    onError: (error) => {
      setFeedbackMessage(getErrorMessage(error, activeCompany?.name ?? "this company"));
    },
  });

  if (companyShellState === "forbidden") {
    return <PermissionDeniedState onSwitchCompany={openCompanySwitcher} />;
  }

  if (companyShellState === "setup") {
    return (
      <CompanySetupRequiredState
        onRetry={retryCompanyAccess}
        onSwitchCompany={openCompanySwitcher}
      />
    );
  }

  if (companyShellState === "loading" || !activeCompany || settingsQuery.isLoading || !settingsQuery.data) {
    return (
      <Card className="border-dashed bg-[rgba(238,243,247,0.45)]">
        <CardContent className="p-6 text-sm text-[var(--xb-muted)]">
          Loading company settings...
        </CardContent>
      </Card>
    );
  }

  return (
    <CompanySettingsForm
      feedbackMessage={feedbackMessage}
      initialValues={settingsQuery.data}
      isSubmitting={updateMutation.isPending}
      onSubmit={async (values) => {
        await updateMutation.mutateAsync(values);
      }}
    />
  );
}
