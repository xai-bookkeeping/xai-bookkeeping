import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/get-current-user";

export async function requireUser() {
  const session = await getCurrentUser();

  if (!session || session.sessionExpired) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  return { error: null, session };
}

export async function requireAdmin() {
  const result = await requireUser();
  if (result.error) return result;

  if (result.session?.user.role !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: result.session,
    };
  }

  return { error: null, session: result.session };
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
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Invalid request.";

  return NextResponse.json(
    { error: message },
    { status: 400 },
  );
}
