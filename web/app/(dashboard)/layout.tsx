import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");
  const { db } = await import("@/lib/db");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      avatarUrl: true,
      company: { select: { logoUrl: true, name: true, taxNumber: true } },
      companyName: true,
      email: true,
      firstName: true,
      lastLoginAt: true,
      lastName: true,
      role: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <AppShell
      company={{
        logoUrl: user.company?.logoUrl ?? null,
        name: user.company?.name ?? user.companyName ?? session.user.companyName ?? "XAI Books workspace",
        taxNumber: user.company?.taxNumber ?? null,
      }}
      user={{
        avatarUrl: user.avatarUrl,
        email: user.email,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        name: `${user.firstName} ${user.lastName}`.trim() || session.user.name,
        role: user.role,
      }}
    >
      {children}
    </AppShell>
  );
}
