import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui";

export function WorkspaceRoute() {
  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <Badge tone="accent" className="w-fit">
            No workspace data yet
          </Badge>
          <CardTitle className="text-2xl">Run your business finances with confidence.</CardTitle>
          <CardDescription className="max-w-2xl text-sm">
            Start the local stack, generate the backend contract, and open the workspace to verify
            the shell is connected.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
          <div className="rounded-[1.25rem] border border-dashed border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--xb-muted)]">
              Workspace probe
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--xb-ink)]">
              The real health and probe status will appear here once the generated API client is
              wired in. This area is reserved for the backend-backed interaction surface.
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-[color:var(--xb-border)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--xb-muted)]">
              Local check
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--xb-ink)]">
              The route is ready for generated contracts, TanStack Query, and the probe refresh
              flow that Plan 03 will wire in.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex-wrap">
          <Button>Open Workspace</Button>
          <span className="text-sm text-[var(--xb-muted)]">
            Generated client output will land in <code>frontend/src/api/</code>.
          </span>
        </CardFooter>
      </Card>
    </section>
  );
}
