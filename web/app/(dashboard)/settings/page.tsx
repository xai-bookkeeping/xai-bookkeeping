import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const metadata: Metadata = { title: "Account settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true,
      preferences: true,
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      sessions: {
        orderBy: { lastSeenAt: "desc" },
        take: 20,
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <SettingsClient
      activeSessionId={session.activeSessionId ?? ""}
      initialActivity={user.activityLogs.map((item) => ({
        action: item.action,
        createdAt: item.createdAt.toISOString(),
        email: item.email,
        id: item.id,
        ip: item.ip,
      }))}
      initialCompany={{
        address: user.company?.address ?? "",
        city: user.company?.city ?? "",
        country: user.company?.country ?? user.country,
        currency: user.company?.currency ?? "AED",
        email: user.company?.email ?? user.email,
        logoUrl: user.company?.logoUrl ?? "",
        name: user.company?.name ?? user.companyName ?? "",
        phone: user.company?.phone ?? "",
        taxNumber: user.company?.taxNumber ?? "",
        timezone: user.company?.timezone ?? "Asia/Dubai",
        website: user.company?.website ?? "",
      }}
      initialPreferences={{
        currency: user.preferences?.currency ?? "AED",
        dateFormat: user.preferences?.dateFormat ?? "dd/MM/yyyy",
        language: user.preferences?.language ?? "en",
        theme: user.preferences?.theme ?? "SYSTEM",
        timeFormat: user.preferences?.timeFormat === "12h" ? "12h" : "24h",
      }}
      initialProfile={{
        accountStatus: user.status,
        authProvider: user.authProvider,
        avatarUrl: user.avatarUrl ?? "",
        bio: user.bio ?? "",
        createdAt: user.createdAt.toISOString(),
        displayName: user.displayName ?? `${user.firstName} ${user.lastName}`,
        email: user.email,
        emailVerified: user.emailVerified,
        firstName: user.firstName,
        jobTitle: user.jobTitle ?? "",
        lastLoginAt: user.lastLoginAt?.toISOString() ?? "",
        lastName: user.lastName,
        phone: user.phone ?? "",
        role: user.role,
        username: user.username ?? "",
        googleConnected: Boolean(user.googleId),
        passwordLoginEnabled: user.passwordLoginEnabled,
      }}
      initialSessions={user.sessions.map((item) => ({
        createdAt: item.createdAt.toISOString(),
        expiresAt: item.expiresAt.toISOString(),
        id: item.id,
        ip: item.ip,
        lastSeenAt: item.lastSeenAt.toISOString(),
        revokedAt: item.revokedAt?.toISOString() ?? "",
        userAgent: item.userAgent,
      }))}
    />
  );
}
