import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAuthBootstrapApiV1AuthBootstrapGet } from "@/api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import { apiClient } from "@/lib/api-runtime";
import { useAuth, useOrganizationList } from "@/lib/clerk";

type CreationStatus = "idle" | "creating" | "error";
type BootstrapQueryError = {
  message: string;
  status: number | null;
};

function getBootstrapErrorMessage(statusCode: number | null): string {
  if (statusCode === 401 || statusCode === 403) {
    return "Your session needs to be refreshed before we can open this workspace.";
  }

  if (statusCode !== null && statusCode >= 500) {
    return "The backend is temporarily unavailable. Try again in a moment.";
  }

  return "We could not confirm your company readiness.";
}

function getBootstrapQueryError(error: unknown): BootstrapQueryError | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const candidate = error as { message?: unknown; status?: unknown };

  if (typeof candidate.message === "string") {
    return {
      message: candidate.message,
      status: typeof candidate.status === "number" ? candidate.status : null,
    };
  }

  return null;
}

export function CreateCompanyRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const { isLoaded: orgListLoaded, createOrganization, setActive } = useOrganizationList();
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState<CreationStatus>("idle");
  const [hasStartedSetup, setHasStartedSetup] = useState(false);
  const [pendingOrganizationId, setPendingOrganizationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCreatingAnotherCompany = searchParams.get("intent") === "new";
  const isWaitingForNewOrganization =
    isCreatingAnotherCompany && pendingOrganizationId !== null && orgId !== pendingOrganizationId;
  const shouldCheckBootstrap =
    isLoaded &&
    isSignedIn &&
    Boolean(orgId) &&
    (!isCreatingAnotherCompany || (pendingOrganizationId !== null && orgId === pendingOrganizationId));

  const bootstrapQuery = useQuery({
    enabled: shouldCheckBootstrap,
    queryKey: ["auth-bootstrap", orgId, pendingOrganizationId, hasStartedSetup, isCreatingAnotherCompany],
    queryFn: async () => {
      const response = await getAuthBootstrapApiV1AuthBootstrapGet({
        client: apiClient,
        responseStyle: "fields",
      });

      if ("error" in response && response.error) {
        const statusCode = response.response?.status ?? null;
        throw {
          message: getBootstrapErrorMessage(statusCode),
          status: statusCode,
        } satisfies BootstrapQueryError;
      }

      return response.data ?? null;
    },
    refetchInterval: (query) =>
      query.state.data?.status === "company_context_pending" ? 1500 : false,
  });

  useEffect(() => {
    if (bootstrapQuery.data?.status === "ready") {
      navigate("/workspace", { replace: true });
    }
  }, [bootstrapQuery.data?.status, navigate]);

  if (isLoaded && !isSignedIn) {
    return <Navigate replace to="/sign-in" />;
  }

  const bootstrapStatus = bootstrapQuery.data?.status;
  const bootstrapError = getBootstrapQueryError(bootstrapQuery.error);
  const isBootstrapAuthRequired = bootstrapError?.status === 401 || bootstrapError?.status === 403;
  const isPendingHandoff =
    isWaitingForNewOrganization ||
    (shouldCheckBootstrap &&
      (bootstrapStatus === "company_context_pending" ||
      bootstrapQuery.isLoading ||
        bootstrapQuery.isFetching));
  const isBusy = status === "creating" || isPendingHandoff;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!companyName.trim() || !orgListLoaded || !createOrganization || !setActive) {
      return;
    }

    try {
      setStatus("creating");
      setHasStartedSetup(true);
      setPendingOrganizationId(null);
      setErrorMessage(null);
      const organization = await createOrganization({ name: companyName.trim() });
      setPendingOrganizationId(organization.id);
      await setActive({ organization: organization.id });
      setStatus("idle");
    } catch (error) {
      setPendingOrganizationId(null);
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Could not create your company workspace.",
      );
    }
  }

  if (bootstrapQuery.isError && bootstrapError) {
    return (
      <div className="min-h-dvh bg-[var(--xb-bg)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[42rem]">
          <Card className="border-[color:var(--xb-border)] bg-white shadow-[var(--xb-shadow)]">
            <CardHeader>
              <Badge tone="warning" className="w-fit">
                {isBootstrapAuthRequired ? "Authentication required" : "Readiness unavailable"}
              </Badge>
              <CardTitle>
                {isBootstrapAuthRequired
                  ? "We need to verify your session again"
                  : "We could not load company readiness"}
              </CardTitle>
              <CardDescription>{bootstrapError.message}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={() => void bootstrapQuery.refetch()}>
                {isBootstrapAuthRequired ? "Check again" : "Retry readiness"}
              </Button>
              <Link
                to="/sign-in"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--xb-border)] bg-transparent px-4 text-sm font-semibold text-[var(--xb-ink)] transition-colors hover:bg-white"
              >
                Back to sign in
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--xb-bg)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[42rem] space-y-6">
        <div className="space-y-3">
          <Badge tone="accent" className="w-fit">
            Company setup
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {isPendingHandoff ? "We are preparing your company workspace." : "Create a company workspace"}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--xb-muted)]">
              {isPendingHandoff
                ? "We are waiting for the backend bootstrap contract to report readiness before opening the workspace."
                : "Give your team a home for finance work. We will connect it to your Clerk organization and keep checking readiness until the workspace opens."}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isPendingHandoff ? "Workspace handoff" : "Company details"}</CardTitle>
            <CardDescription>
              {isWaitingForNewOrganization
                ? "Your organization is being switched over. We will start readiness checks after the active company context changes."
                : isPendingHandoff
                ? "Keep this page open while we check the local company record."
                : "Start with the legal or working name. Settings like TRN and VAT status come next."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isPendingHandoff ? (
              <div className="space-y-4 rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-5">
                <p className="text-sm font-semibold text-[var(--xb-ink)]">
                  {isWaitingForNewOrganization
                    ? "Waiting for company activation..."
                    : bootstrapStatus === "company_context_pending"
                    ? "We are preparing your company workspace."
                    : "Checking company readiness..."}
                </p>
                <p className="text-sm leading-6 text-[var(--xb-muted)]">
                  {isWaitingForNewOrganization
                    ? "The new organization has been created. We will only check readiness after Clerk switches the active organization."
                    : bootstrapStatus === "company_context_pending"
                    ? "Your organization is active. We are waiting for the local company context to catch up before opening the workspace."
                    : "We are syncing the backend readiness contract before opening your workspace."}
                </p>
                <div className="flex flex-wrap gap-3">
                  {isWaitingForNewOrganization ? (
                    <Button disabled type="button">
                      Waiting for activation...
                    </Button>
                  ) : (
                    <Button
                      disabled={bootstrapQuery.isFetching}
                      onClick={() => {
                        void bootstrapQuery.refetch();
                      }}
                    >
                      {bootstrapQuery.isFetching ? "Checking..." : "Check readiness"}
                    </Button>
                  )}
                  <Link
                    to="/sign-in"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--xb-border)] bg-white px-4 text-sm font-semibold text-[var(--xb-ink)] transition-colors hover:bg-slate-50"
                  >
                    Back to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--xb-ink)]" htmlFor="company-name">
                    Company name
                  </label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="Al Noor Trading LLC"
                    required
                  />
                </div>

                {status === "error" && errorMessage ? (
                  <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button disabled={!isLoaded || !orgListLoaded || isBusy || !companyName.trim()} type="submit">
                    {status === "creating" ? "Creating workspace..." : "Create company workspace"}
                  </Button>
                  <p className="text-sm text-[var(--xb-muted)]">
                    We will connect this to your active organization and continue setup safely.
                  </p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
