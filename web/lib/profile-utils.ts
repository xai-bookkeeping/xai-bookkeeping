import { CheckCircle2, Clock3, CreditCard, FileCheck2, FilePlus2, Pencil, UserPlus } from "lucide-react";
import type { TimelineItem } from "@/components/profile/ProfileShell";

export function money(value: number, currency = "AED") {
  return new Intl.NumberFormat("en-AE", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function shortDate(value: Date | string | null | undefined) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(value));
}

export function dateTime(value: Date | string | null | undefined) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(new Date(value));
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "XB";
}

export function prettyAction(action: string) {
  return action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function timelineFromActivity(
  rows: Array<{ action: string; createdAt: Date; email: string | null; metadata: unknown }>,
): TimelineItem[] {
  return rows.map((row) => {
    const action = row.action;
    const Icon =
      action.includes("PAYMENT")
        ? CreditCard
        : action.includes("APPROVED") || action.includes("POSTED")
          ? FileCheck2
          : action.includes("CREATED") || action.includes("ADDED")
            ? FilePlus2
            : action.includes("UPDATED")
              ? Pencil
              : action.includes("USER")
                ? UserPlus
                : action.includes("SUBMITTED")
                  ? CheckCircle2
                  : Clock3;

    return {
      actor: row.email,
      description: metadataSubject(row.metadata),
      icon: Icon,
      timestamp: dateTime(row.createdAt),
      title: prettyAction(row.action),
    };
  });
}

function metadataSubject(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "";
  const data = metadata as Record<string, unknown>;
  return String(
    data.invoiceNumber ??
      data.category ??
      data.name ??
      data.customerName ??
      data.supplierName ??
      data.routeId ??
      "",
  );
}
