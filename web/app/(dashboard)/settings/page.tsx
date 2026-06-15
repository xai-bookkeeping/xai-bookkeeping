import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const metadata: Metadata = { title: "Account settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");
  const { tab } = await searchParams;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true,
      preferences: true,
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <SettingsClient
      initialActiveTab={tab === "company" ? "company" : undefined}
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
        coverImageUrl: user.company?.coverImageUrl ?? "",
        country: user.company?.country ?? user.country,
        currency: user.company?.currency ?? "AED",
        primaryColor: user.company?.primaryColor ?? "#0ea5e9",
        secondaryColor: user.company?.secondaryColor ?? "#0f172a",
        accentColor: user.company?.accentColor ?? "#22c55e",
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
        avatarUrl: user.avatarUrl ?? "",
        bio: user.bio ?? "",
        createdAt: user.createdAt.toISOString(),
        displayName: user.displayName ?? `${user.firstName} ${user.lastName}`,
        email: user.email,
        firstName: user.firstName,
        jobTitle: user.jobTitle ?? "",
        lastLoginAt: user.lastLoginAt?.toISOString() ?? "",
        lastName: user.lastName,
        phone: user.phone ?? "",
        role: user.role,
        username: user.username ?? "",
      }}
    />
  );
}
