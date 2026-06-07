import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth, useOrganizationList } from "@clerk/react";
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

type CreationStatus = "idle" | "creating" | "pending" | "error";

export function CreateCompanyRoute() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const { isLoaded: orgListLoaded, createOrganization, setActive } = useOrganizationList();
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState<CreationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "pending" && orgId) {
      const timer = window.setTimeout(() => {
        navigate("/workspace", { replace: true });
      }, 1200);

      return () => window.clearTimeout(timer);
    }
  }, [navigate, orgId, status]);

  if (isLoaded && !isSignedIn) {
    return <Navigate replace to="/sign-in" />;
  }

  if (isLoaded && orgId && status !== "pending") {
    return <Navigate replace to="/workspace" />;
  }

  const isBusy = status === "creating" || status === "pending";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!companyName.trim() || !orgListLoaded || !createOrganization || !setActive) {
      return;
    }

    try {
      setStatus("creating");
      setErrorMessage(null);
      const organization = await createOrganization({ name: companyName.trim() });
      await setActive({ organization: organization.id });
      setStatus("pending");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not create your workspace.");
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--xb-bg)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[42rem] space-y-6">
        <div className="space-y-3">
          <Badge tone="accent" className="w-fit">
            First company setup
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Create a company workspace</h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--xb-muted)]">
              Give your team a home for finance work. We will connect it to your Clerk organization
              and hand you into the workspace once setup is ready.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company details</CardTitle>
            <CardDescription>
              Start with the legal or working name. Settings like TRN and VAT status come next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {status === "pending" ? (
              <div className="space-y-4 rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-5">
                <p className="text-sm font-semibold text-[var(--xb-ink)]">
                  We are preparing your company workspace.
                </p>
                <p className="text-sm leading-6 text-[var(--xb-muted)]">
                  Your organization is active. We are waiting for the backend company mirror to
                  catch up before opening the workspace.
                </p>
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
