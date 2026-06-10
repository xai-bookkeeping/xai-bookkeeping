import { requireUser } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { error, session } = await requireUser();
  if (error) return error;

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  const activity = await db.activityLog.findMany({
    where: {
      userId: session.user.id,
      ...(action ? { action: action as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ activity });
}
