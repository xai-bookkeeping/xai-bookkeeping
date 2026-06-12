export type AppRole = "ADMIN" | "ACCOUNTANT" | "APPROVER" | "VIEWER" | "USER";

export function canManageUsers(role: string) {
  return role === "ADMIN";
}

export function canManageApprovalRoutes(role: string) {
  return role === "ADMIN";
}

export function canCreateFinanceRecords(role: string) {
  return role === "ADMIN" || role === "ACCOUNTANT";
}

export function canSubmitForApproval(role: string) {
  return role === "ADMIN" || role === "ACCOUNTANT";
}

export function canApproveByRole(role: string) {
  return role === "ADMIN" || role === "APPROVER";
}

export function canPostFinanceRecords(role: string) {
  return role === "ADMIN" || role === "ACCOUNTANT";
}
