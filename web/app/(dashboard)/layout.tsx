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
      company: {
        select: {
          accentColor: true,
          logoUrl: true,
          name: true,
          primaryColor: true,
          secondaryColor: true,
          taxNumber: true,
        },
      },
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
        accentColor: user.company?.accentColor ?? "#22c55e",
        logoUrl: user.company?.logoUrl ?? null,
        name: user.company?.name ?? user.companyName ?? session.user.companyName ?? "XAI Books workspace",
        primaryColor: user.company?.primaryColor ?? "#0ea5e9",
        secondaryColor: user.company?.secondaryColor ?? "#0f172a",
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
