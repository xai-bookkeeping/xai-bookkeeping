import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UsersClient } from "@/components/users/UsersClient";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "User Management" };

const PAGE_SIZE = 12;

export default async function UsersPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [total, users] = await db.$transaction([
    db.user.count(),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        username: true,
        email: true,
        phone: true,
        jobTitle: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <UsersClient
      initialData={{
        page: 1,
        pageSize: PAGE_SIZE,
        total,
        users: users.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        })),
      }}
    />
  );
}
