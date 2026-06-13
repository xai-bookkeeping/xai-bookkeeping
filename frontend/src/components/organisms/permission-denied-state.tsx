import { Link } from "react-router-dom";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

type PermissionDeniedStateProps = {
  onSwitchCompany: () => void;
};

export function PermissionDeniedState({ onSwitchCompany }: PermissionDeniedStateProps) {
  return (
    <Card className="border-[color:var(--xb-border)] bg-white shadow-sm">
      <CardHeader className="space-y-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] text-lg">
          🔒
        </div>
        <div className="space-y-2">
          <CardTitle>You do not have access to this company</CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-6">
            Switch to an authorized company or ask an admin for access.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onSwitchCompany}>
          Switch company
        </Button>

        <Link
          to="/workspace"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--xb-border)] bg-transparent px-4 text-sm font-semibold text-[var(--xb-ink)] transition-colors hover:bg-white"
        >
          Back to workspace
        </Link>
      </CardContent>
    </Card>
  );
}
