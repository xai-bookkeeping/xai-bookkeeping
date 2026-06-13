import { Link } from "react-router-dom";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

type CompanySetupRequiredStateProps = {
  onRetry: () => void;
  onSwitchCompany?: () => void;
};

export function CompanySetupRequiredState({
  onRetry,
  onSwitchCompany,
}: CompanySetupRequiredStateProps) {
  return (
    <Card className="border-[color:var(--xb-border)] bg-white shadow-sm">
      <CardHeader className="space-y-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] text-lg">
          ⏳
        </div>
        <div className="space-y-2">
          <CardTitle>We&apos;re finishing your company workspace</CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-6">
            Your company is active and we are finishing the handoff into the workspace. Keep this
            page open while we confirm readiness and bring the company view online.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-3">
        <Button onClick={onRetry}>Check readiness</Button>

        {onSwitchCompany ? (
          <Button variant="secondary" onClick={onSwitchCompany}>
            Switch company
          </Button>
        ) : null}

        <Link
          to="/create-company"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--xb-border)] bg-transparent px-4 text-sm font-semibold text-[var(--xb-ink)] transition-colors hover:bg-white"
        >
          Continue company setup
        </Link>
      </CardContent>
    </Card>
  );
}
