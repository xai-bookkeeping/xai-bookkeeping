import { NextResponse } from "next/server";
import { requireUser, requestContext } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { outstandingAmount } from "@/lib/payment-calculations";

interface Props {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const payment = await db.payment.findFirst({
    where: { id, ownerId: session!.user.id, deletedAt: null },
    include: {
      invoice: {
        include: { payments: { where: { deletedAt: null } } },
      },
    },
  });
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

  await db.$transaction(async (tx) => {
    await tx.payment.update({ where: { id }, data: { deletedAt: new Date() } });

    const remainingPayments = payment.invoice.payments.filter((item) => item.id !== id);
    const outstanding = outstandingAmount(payment.invoice.total, remainingPayments);
    if (outstanding > 0 && payment.invoice.status === "PAID") {
      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: "POSTED", paidAt: null },
      });
    }
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "PAYMENT_DELETED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: {
      paymentId: id,
      invoiceId: payment.invoiceId,
      invoiceNumber: payment.invoice.invoiceNumber,
      amount: Number(payment.amount),
    },
  });

  return NextResponse.json({ ok: true });
}
