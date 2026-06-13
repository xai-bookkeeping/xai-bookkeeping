import { describe, expect, it } from "vitest";
import {
  canApproveByRole,
  canCreateFinanceRecords,
  canManageApprovalRoutes,
  canManageUsers,
  canPostFinanceRecords,
  canSubmitForApproval,
} from "@/lib/permissions";

describe("permissions", () => {
  it("limits user and approval-route management to admins", () => {
    expect(canManageUsers("ADMIN")).toBe(true);
    expect(canManageUsers("ACCOUNTANT")).toBe(false);
    expect(canManageApprovalRoutes("ADMIN")).toBe(true);
    expect(canManageApprovalRoutes("APPROVER")).toBe(false);
  });

  it("allows accountants to create, submit, and post finance records", () => {
    expect(canCreateFinanceRecords("ADMIN")).toBe(true);
    expect(canCreateFinanceRecords("ACCOUNTANT")).toBe(true);
    expect(canCreateFinanceRecords("VIEWER")).toBe(false);

    expect(canSubmitForApproval("ADMIN")).toBe(true);
    expect(canSubmitForApproval("ACCOUNTANT")).toBe(true);
    expect(canSubmitForApproval("USER")).toBe(false);

    expect(canPostFinanceRecords("ADMIN")).toBe(true);
    expect(canPostFinanceRecords("ACCOUNTANT")).toBe(true);
    expect(canPostFinanceRecords("APPROVER")).toBe(false);
  });

  it("allows approvers to approve by role", () => {
    expect(canApproveByRole("ADMIN")).toBe(true);
    expect(canApproveByRole("APPROVER")).toBe(true);
    expect(canApproveByRole("ACCOUNTANT")).toBe(false);
  });
});
