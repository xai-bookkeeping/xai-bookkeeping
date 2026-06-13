import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/components/ui";

type Role = "accountant" | "admin" | "owner" | "viewer";

const roleDescriptions: Record<Role, string> = {
  accountant: "Can work with finance records, reports, and audit history.",
  admin: "Full company access except billing ownership.",
  owner: "Full company access, including billing and company management.",
  viewer: "Can view records and reports but cannot make changes.",
};

export function InviteMemberDialog({
  disabled = false,
  isOpen,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: {
  disabled?: boolean;
  isOpen: boolean;
  isSubmitting?: boolean;
  onOpenChange: (next: boolean) => void;
  onSubmit: (payload: { email_address: string; message: string; role: Role }) => Promise<void> | void;
}) {
  const [emailAddress, setEmailAddress] = useState("");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<Role>("viewer");

  useEffect(() => {
    if (!isOpen) {
      setEmailAddress("");
      setMessage("");
      setRole("viewer");
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-label="Invite member"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-[2px]"
      role="dialog"
    >
      <Card className="w-full max-w-xl rounded-[1.25rem]">
        <CardHeader>
          <CardTitle>Invite member</CardTitle>
          <CardDescription>
            Invite your accountant, finance team, or business partner to start working in this
            company.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-[var(--xb-ink)]">Work email</span>
            <Input
              aria-label="Work email"
              disabled={disabled || isSubmitting}
              onChange={(event) => setEmailAddress(event.target.value)}
              placeholder="name@company.com"
              value={emailAddress}
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-[var(--xb-ink)]">Role</span>
            <select
              aria-label="Role"
              className="flex h-11 w-full rounded-2xl border border-[color:var(--xb-border)] bg-white px-4 text-sm text-[var(--xb-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-accent)]"
              disabled={disabled || isSubmitting}
              onChange={(event) => setRole(event.target.value as Role)}
              value={role}
            >
              <option value="viewer">Viewer</option>
              <option value="accountant">Accountant</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
            <p className="text-sm leading-6 text-[var(--xb-muted)]">{roleDescriptions[role]}</p>
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-[var(--xb-ink)]">Optional message</span>
            <textarea
              aria-label="Optional message"
              className="min-h-28 w-full rounded-2xl border border-[color:var(--xb-border)] bg-white px-4 py-3 text-sm text-[var(--xb-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-accent)]"
              disabled={disabled || isSubmitting}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Add context for the invite."
              value={message}
            />
          </label>

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              disabled={disabled || isSubmitting || !emailAddress.trim()}
              onClick={async () => {
                await onSubmit({
                  email_address: emailAddress.trim(),
                  message: message.trim(),
                  role,
                });
              }}
            >
              {isSubmitting ? "Sending invitation..." : "Send invitation"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
