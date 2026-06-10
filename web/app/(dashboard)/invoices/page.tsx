import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { InvoicesClient } from "@/components/invoices/InvoicesClient";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Invoices" };

const PAGE_SIZE = 12;

function serializeInvoice(invoice: any) {
  return {
    ...invoice,
    subtotal: Number(invoice.subtotal),
    vatTotal: Number(invoice.vatTotal),
    total: Number(invoice.total),
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate?.toISOString().slice(0, 10) ?? null,
    approvedAt: invoice.approvedAt?.toISOString() ?? null,
    postedAt: invoice.postedAt?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    deletedAt: invoice.deletedAt?.toISOString() ?? null,
    lines: invoice.lines.map((line: any) => ({
      ...line,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      vatRate: Number(line.vatRate),
      lineSubtotal: Number(line.lineSubtotal),
      lineVat: Number(line.lineVat),
      lineTotal: Number(line.lineTotal),
    })),
  };
}

export default async function InvoicesPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const [customers, total, invoices] = await db.$transaction([
    db.customer.findMany({
      where: { ownerId: session.user.id, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, trn: true },
    }),
    db.invoice.count({ where: { ownerId: session.user.id, deletedAt: null } }),
    db.invoice.findMany({
      where: { ownerId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: { customer: true, lines: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  return (
    <InvoicesClient
      customers={customers}
      initialData={{
        invoices: invoices.map(serializeInvoice),
        page: 1,
        pageSize: PAGE_SIZE,
        total,
      }}
      role={session.user.role}
    />
  );
}
