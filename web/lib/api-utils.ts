import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function requireUser() {
  const session = await auth();

  if (!session || session.sessionExpired) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  return { error: null, session };
}

export async function requestContext() {
  const headersList = await headers();
  return {
    ip:
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      "unknown",
    userAgent: headersList.get("user-agent") ?? undefined,
  };
}

export function validationError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Invalid request." },
    { status: 400 },
  );
}
