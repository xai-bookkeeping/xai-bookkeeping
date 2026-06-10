import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PaymentsClient } from "@/components/payments/PaymentsClient";
import { db } from "@/lib/db";
import { outstandingAmount, paidAmount } from "@/lib/payment-calculations";

export const metadata: Metadata = { title: "Payments" };

const PAGE_SIZE = 12;

function serializePayment(payment: any) {
  return {
    ...payment,
    amount: Number(payment.amount),
    paymentDate: payment.paymentDate.toISOString().slice(0, 10),
    createdAt: payment.createdAt.toISOString(),
    deletedAt: payment.deletedAt?.toISOString() ?? null,
    invoice: {
      ...payment.invoice,
      total: Number(payment.invoice.total),
      paidAmount: paidAmount(payment.invoice.payments ?? []),
      outstandingAmount: outstandingAmount(payment.invoice.total, payment.invoice.payments ?? []),
      issueDate: payment.invoice.issueDate.toISOString().slice(0, 10),
      customer: payment.invoice.customer,
    },
  };
}

function serializeInvoiceOption(invoice: any) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    total: Number(invoice.total),
    paidAmount: paidAmount(invoice.payments ?? []),
    outstandingAmount: outstandingAmount(invoice.total, invoice.payments ?? []),
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    status: invoice.status,
    customer: invoice.customer,
  };
}

export default async function PaymentsPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const [invoiceOptions, total, payments] = await db.$transaction([
    db.invoice.findMany({
      where: {
        ownerId: session.user.id,
        deletedAt: null,
        status: { in: ["POSTED", "PAID"] },
      },
      orderBy: { issueDate: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        payments: { where: { deletedAt: null } },
      },
    }),
    db.payment.count({ where: { ownerId: session.user.id, deletedAt: null } }),
    db.payment.findMany({
      where: { ownerId: session.user.id, deletedAt: null },
      orderBy: { paymentDate: "desc" },
      take: PAGE_SIZE,
      include: {
        invoice: {
          include: {
            customer: { select: { id: true, name: true } },
            payments: { where: { deletedAt: null } },
          },
        },
      },
    }),
  ]);

  return (
    <PaymentsClient
      initialData={{
        page: 1,
        pageSize: PAGE_SIZE,
        total,
        payments: payments.map(serializePayment),
      }}
      invoiceOptions={invoiceOptions.map(serializeInvoiceOption)}
    />
  );
}
