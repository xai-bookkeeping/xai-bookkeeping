import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import type { Prisma, Role } from "@prisma/client";
import { cache } from "react";
import { db } from "@/lib/db";
import type { CurrentUserSession } from "@/types/current-user";

const fallbackCompanyName = "XAI Books workspace";
const roles: Role[] = ["ADMIN", "ACCOUNTANT", "APPROVER", "VIEWER"];
const userSessionInclude = {
  company: { select: { name: true } },
  roleAssignments: {
    include: { role: { select: { name: true } } },
    where: { active: true },
  },
} satisfies Prisma.UserInclude;

type UserWithRoles = NonNullable<Awaited<ReturnType<typeof loadUser>>>;

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function metadataRole(value: unknown): Role | null {
  return typeof value === "string" && roles.includes(value as Role) ? (value as Role) : null;
}

async function loadUser(clerkUserId: string) {
  return db.user.findUnique({
    where: { clerkUserId },
    include: userSessionInclude,
  });
}

async function selfHealUser(clerkUserId: string) {
  const clerkUser = await clerkCurrentUser();
  const email =
    clerkUser?.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress;

  if (!clerkUser || !email) return null;

  const normalizedEmail = email.toLowerCase();
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: userSessionInclude,
  });

  if (existingUser) {
    return db.user.update({
      where: { id: existingUser.id },
      data: {
        avatarUrl: clerkUser.imageUrl,
        clerkUserId,
        email: normalizedEmail,
        firstName: clerkUser.firstName ?? "",
        lastName: clerkUser.lastName ?? "",
      },
      include: userSessionInclude,
    });
  }

  const existingUsers = await db.user.count();
  const role = metadataRole(clerkUser.publicMetadata.role) ?? (existingUsers === 0 ? "ADMIN" : "ACCOUNTANT");

  return db.user.create({
    data: {
      avatarUrl: clerkUser.imageUrl,
      clerkUserId,
      email: normalizedEmail,
      firstName: clerkUser.firstName ?? "",
      lastName: clerkUser.lastName ?? "",
      onboardingCompleted: false,
      role,
      status: "ACTIVE",
    },
    include: userSessionInclude,
  });
}

function toSession(user: UserWithRoles): CurrentUserSession | null {
  if (user.status === "SUSPENDED" || user.status === "DISABLED") return null;

  const assignedRoles = user.roleAssignments.map((assignment) => assignment.role.name);
  const fallbackRole = `_${user.role}`;
  const availableRoles = [...new Set(assignedRoles.length > 0 ? assignedRoles : [fallbackRole])];
  const activeRoleName = availableRoles[0];
  const activeRole = activeRoleName?.replace(/^_/, "") || user.role;

  return {
    onboardingRequired: !user.onboardingCompleted,
    sessionExpired: false,
    user: {
      assignedRoles: availableRoles,
      authProvider: "CLERK",
      companyName: user.companyName ?? user.company?.name ?? fallbackCompanyName,
      email: user.email,
      id: user.id,
      image: user.avatarUrl,
      name: fullName(user.firstName, user.lastName) || user.email,
      role: activeRole,
      selectedRole: activeRoleName,
    },
  };
}

export const getCurrentUser = cache(async (): Promise<CurrentUserSession | null> => {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return null;

  const user = (await loadUser(userId)) ?? (await selfHealUser(userId));
  return user ? toSession(user) : null;
});
