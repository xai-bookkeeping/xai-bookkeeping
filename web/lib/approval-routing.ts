import type { ApprovalDocumentType, ApprovalRoute, Role } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { canApproveByRole } from "@/lib/permissions";

type DbLike = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export async function findApprovalRoute({
  amount,
  documentType,
  ownerId,
  tx,
}: {
  amount: number;
  documentType: ApprovalDocumentType;
  ownerId: string;
  tx: DbLike;
}) {
  const routes = await tx.approvalRoute.findMany({
    where: {
      active: true,
      documentType,
      minAmount: { lte: amount },
      ownerId,
      OR: [{ maxAmount: null }, { maxAmount: { gte: amount } }],
    },
    orderBy: [{ priority: "asc" }, { minAmount: "desc" }],
    take: 1,
  });

  return routes[0] ?? null;
}

export function canApproveRoutedDocument({
  assignedApproverId,
  currentUserId,
  currentUserRole,
  route,
}: {
  assignedApproverId: string | null;
  currentUserId: string;
  currentUserRole: string;
  route: Pick<ApprovalRoute, "approverId" | "approverRole"> | null;
}) {
  if (currentUserRole === "ADMIN") return true;
  if (assignedApproverId && assignedApproverId === currentUserId) return true;
  if (route?.approverId) return route.approverId === currentUserId;
  if (route?.approverRole) return route.approverRole === (currentUserRole as Role);
  return canApproveByRole(currentUserRole);
}

export function routeAssignment(route: ApprovalRoute | null) {
  return {
    approvalRouteId: route?.id ?? null,
    assignedApproverId: route?.approverId ?? null,
  };
}
