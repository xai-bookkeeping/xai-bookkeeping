import type { AuditEventResponse } from "@/api";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AuditEventTable({
  deniedMessage,
  events,
}: {
  deniedMessage: string | null;
  events: AuditEventResponse[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <Badge tone="accent" className="w-fit">
              Company activity
            </Badge>
            <CardTitle>Activity & audit log</CardTitle>
            <CardDescription>
              Every important action - who did it, when, and what changed. Company-scoped.
            </CardDescription>
          </div>
          <Button aria-label="Export log" disabled variant="secondary">
            Export log
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {deniedMessage ? (
          <div className="rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] px-4 py-3 text-sm text-[var(--xb-ink)]">
            {deniedMessage}
          </div>
        ) : null}

        {events.length ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="grid gap-3 rounded-[1.25rem] border border-[color:var(--xb-border)] bg-white p-4 lg:grid-cols-[minmax(0,1.4fr)_180px_160px]"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--xb-ink)]">{event.action}</p>
                  <p className="text-sm text-[var(--xb-muted)]">
                    {event.entity_type} #{event.entity_id}
                  </p>
                </div>
                <div className="space-y-1 text-sm text-[var(--xb-muted)]">
                  <p>{event.actor_clerk_user_id ?? "system"}</p>
                  <p>{event.after_state ? JSON.stringify(event.after_state) : "No detail"}</p>
                </div>
                <div className="text-sm text-[var(--xb-muted)]">{formatTimestamp(event.created_at)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-5">
            <p className="text-sm font-semibold text-[var(--xb-ink)]">No activity recorded yet</p>
            <p className="mt-2 text-sm leading-6 text-[var(--xb-muted)]">
              Login, invite, role, and settings changes will appear here once they happen.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
