import { requireUser } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import { NextResponse } from "next/server";

const auditActions = Object.values(AuditAction);
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

function actionsForCategory(category: string | null) {
  if (!category || category === "all") return auditActions;
  const prefixes =
    category === "security"
      ? securityPrefixes
      : category === "business"
        ? businessPrefixes
        : category === "users"
          ? userPrefixes
          : [];

  return auditActions.filter((action) => prefixes.some((prefix) => action.startsWith(prefix)));
}

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

export async function GET(request: Request) {
  const { error, session } = await requireUser();
  if (error) return error;

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const category = url.searchParams.get("category");
  const query = url.searchParams.get("q")?.trim();
  const from = parseDate(url.searchParams.get("from"));
  const to = parseDate(url.searchParams.get("to"), true);
  const take = Math.min(Math.max(Number(url.searchParams.get("take") ?? 100), 1), 250);
  const skip = Math.max(Number(url.searchParams.get("skip") ?? 0), 0);
  const categoryActions = actionsForCategory(category);
  const selectedActions =
    action && auditActions.includes(action as AuditAction)
      ? [action as AuditAction]
      : categoryActions;
  const matchingSearchActions = query
    ? auditActions.filter((item) => item.replaceAll("_", " ").toLowerCase().includes(query.toLowerCase()))
    : [];

  const where = {
    userId: session.user.id,
    action: { in: selectedActions },
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" as const } },
            { ip: { contains: query, mode: "insensitive" as const } },
            { userAgent: { contains: query, mode: "insensitive" as const } },
            ...(matchingSearchActions.length ? [{ action: { in: matchingSearchActions } }] : []),
          ],
        }
      : {}),
  };

  const [activity, total] = await db.$transaction([
    db.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
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
    db.activityLog.count({ where }),
  ]);

  const allMatchingActivity = await db.activityLog.findMany({
    where,
    select: { action: true, email: true },
  });

  return NextResponse.json({
    activity,
    actions: auditActions,
    total,
    summary: {
      business: allMatchingActivity.filter((item) => businessPrefixes.some((prefix) => item.action.startsWith(prefix))).length,
      security: allMatchingActivity.filter((item) => securityPrefixes.some((prefix) => item.action.startsWith(prefix))).length,
      total: allMatchingActivity.length,
      uniqueActors: new Set(allMatchingActivity.map((item) => item.email).filter(Boolean)).size,
      users: allMatchingActivity.filter((item) => userPrefixes.some((prefix) => item.action.startsWith(prefix))).length,
    },
  });
}
