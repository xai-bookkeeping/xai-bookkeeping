import { NextRequest, NextResponse } from "next/server";
import { ensureAdminDefaults } from "@/lib/admin-defaults";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ roles: [] });
  }

  await ensureAdminDefaults();

  const user = await db.user.findUnique({
    where: { email },
    select: {
      role: true,
      roleAssignments: {
        where: { active: true },
        include: { role: true },
        orderBy: { role: { name: "asc" } },
      },
    },
  });

  if (!user) return NextResponse.json({ roles: [] });

  const assigned = user.roleAssignments.map((assignment) => assignment.role.name);
  const fallback = `_${user.role}`;
  const roles = [...new Set(assigned.length > 0 ? assigned : [fallback])];

  return NextResponse.json({ roles });
}
