import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

const roles: Role[] = ["ADMIN", "ACCOUNTANT", "APPROVER", "VIEWER"];

type ClerkEmail = {
  email_address?: string;
  id?: string;
};

type ClerkUserData = {
  email_addresses?: ClerkEmail[];
  first_name?: string | null;
  id: string;
  image_url?: string | null;
  last_name?: string | null;
  primary_email_address_id?: string | null;
  public_metadata?: Record<string, unknown> | null;
};

type ClerkDeletedData = {
  id?: string;
};

type ClerkSessionData = {
  id?: string;
  user_id?: string;
};

function primaryEmail(data: ClerkUserData) {
  return (
    data.email_addresses?.find((item) => item.id === data.primary_email_address_id)?.email_address ??
    data.email_addresses?.[0]?.email_address ??
    ""
  ).toLowerCase();
}

function metadataRole(value: unknown): Role | null {
  return typeof value === "string" && roles.includes(value as Role) ? (value as Role) : null;
}

async function upsertUser(data: ClerkUserData) {
  const email = primaryEmail(data);
  if (!email) return;

  const existingUser =
    (await db.user.findUnique({
      select: { id: true },
      where: { clerkUserId: data.id },
    })) ??
    (await db.user.findUnique({
      select: { id: true },
      where: { email },
    }));

  if (existingUser) {
    await db.user.update({
      data: {
        avatarUrl: data.image_url ?? null,
        clerkUserId: data.id,
        email,
        firstName: data.first_name ?? "",
        lastName: data.last_name ?? "",
      },
      where: { id: existingUser.id },
    });
    return;
  }

  const existingUsers = await db.user.count();
  const role = metadataRole(data.public_metadata?.role) ?? (existingUsers === 0 ? "ADMIN" : "ACCOUNTANT");

  await db.user.create({
    data: {
      avatarUrl: data.image_url ?? null,
      clerkUserId: data.id,
      email,
      firstName: data.first_name ?? "",
      lastName: data.last_name ?? "",
      onboardingCompleted: false,
      role,
      status: "ACTIVE",
    },
  });
}

async function markDeleted(data: ClerkDeletedData) {
  if (!data.id) return;
  await db.user.updateMany({
    data: { status: "DISABLED" },
    where: { clerkUserId: data.id },
  });
}

async function logSession(data: ClerkSessionData, action: "LOGIN_SUCCEEDED" | "LOGOUT") {
  if (!data.user_id) return;
  const user = await db.user.findUnique({
    select: { email: true, id: true },
    where: { clerkUserId: data.user_id },
  });

  if (action === "LOGIN_SUCCEEDED" && user) {
    await db.user.update({
      data: { lastLoginAt: new Date() },
      where: { id: user.id },
    });
  }

  await db.activityLog.create({
    data: {
      action,
      email: user?.email ?? null,
      metadata: data.id ? { clerkSessionId: data.id } : undefined,
      userId: user?.id ?? null,
    },
  });
}

export async function POST(req: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(req, {
      signingSecret: process.env.CLERK_WEBHOOK_SECRET ?? process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    });
  } catch {
    return new Response("Verification failed", { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    await upsertUser(event.data as ClerkUserData);
  } else if (event.type === "user.deleted") {
    await markDeleted(event.data as ClerkDeletedData);
  } else if (event.type === "session.created") {
    await logSession(event.data as ClerkSessionData, "LOGIN_SUCCEEDED");
  } else if (event.type === "session.ended") {
    await logSession(event.data as ClerkSessionData, "LOGOUT");
  }

  return new Response("OK", { status: 200 });
}
