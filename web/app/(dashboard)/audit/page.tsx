import type { Metadata } from "next";
import { AuditAction } from "@prisma/client";
import { auth } from "@/auth";
import { AuditTrailClient } from "@/components/audit/AuditTrailClient";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Audit trail" };

const securityPrefixes = [
  "LOGIN",
  "LOGOUT",
  "PASSWORD",
  "SESSION",
  "SESSIONS",
  "EMAIL",
  "TWO_FACTOR",
];
const businessPrefixes = ["CUSTOMER", "SUPPLIER", "INVOICE", "PAYMENT", "EXPENSE", "COMPANY"];
const userPrefixes = ["USER", "PROFILE", "AVATAR", "PREFERENCES"];

export default async function AuditPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const [activity, allActivity] = await db.$transaction([
    db.activityLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        action: true,
        createdAt: true,
        email: true,
        id: true,
        ip: true,
        metadata: true,
        userAgent: true,
      },
    }),
    db.activityLog.findMany({
      where: { userId: session.user.id },
      select: { action: true, email: true },
    }),
  ]);

  return (
    <AuditTrailClient
      actions={Object.values(AuditAction)}
      initialActivity={activity.map((item) => ({
        action: item.action,
        createdAt: item.createdAt.toISOString(),
        email: item.email,
        id: item.id,
        ip: item.ip,
        metadata: item.metadata,
        userAgent: item.userAgent,
      }))}
      initialSummary={{
        business: allActivity.filter((item) => businessPrefixes.some((prefix) => item.action.startsWith(prefix))).length,
        security: allActivity.filter((item) => securityPrefixes.some((prefix) => item.action.startsWith(prefix))).length,
        total: allActivity.length,
        uniqueActors: new Set(allActivity.map((item) => item.email).filter(Boolean)).size,
        users: allActivity.filter((item) => userPrefixes.some((prefix) => item.action.startsWith(prefix))).length,
      }}
      initialTotal={allActivity.length}
    />
  );
}

