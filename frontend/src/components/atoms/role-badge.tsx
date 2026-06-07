import { Badge } from "@/components/ui";

type Role = "accountant" | "admin" | "owner" | "viewer";

const roleTone: Record<Role, "accent" | "default" | "success"> = {
  accountant: "success",
  admin: "accent",
  owner: "accent",
  viewer: "default",
};

export function RoleBadge({
  label,
  role,
}: {
  label: string;
  role: Role;
}) {
  return <Badge tone={roleTone[role]}>{label}</Badge>;
}
