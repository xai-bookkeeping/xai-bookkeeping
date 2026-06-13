import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { TaskChooseOrganization } from "@/lib/clerk";

export function ChooseOrganizationTaskRoute() {
  return (
    <div className="min-h-dvh bg-[var(--xb-bg)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[42rem] space-y-6">
        <div className="space-y-3">
          <Badge tone="accent" className="w-fit">
            Company access
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Finish company access</h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--xb-muted)]">
              Complete the required organization step, then we will continue into company readiness.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organization selection</CardTitle>
            <CardDescription>
              This keeps Clerk organization access aligned with the XAI company workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskChooseOrganization redirectUrlComplete="/create-company" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
