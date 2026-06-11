import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { postPaymentJournal } from "@/lib/accounting";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { outstandingAmount, paidAmount, roundMoney } from "@/lib/payment-calculations";
import { paymentListQuerySchema, paymentMutationSchema } from "@/lib/payment-validations";

const PAGE_SIZE = 12;

function serializePayment(payment: any) {
  return {
    ...payment,
    amount: Number(payment.amount),
    paymentDate: payment.paymentDate.toISOString().slice(0, 10),
    createdAt: payment.createdAt.toISOString(),
    deletedAt: payment.deletedAt?.toISOString() ?? null,
    invoice: payment.invoice
      ? {
          ...payment.invoice,
          total: Number(payment.invoice.total),
          paidAmount: paidAmount(payment.invoice.payments ?? []),
          outstandingAmount: outstandingAmount(payment.invoice.total, payment.invoice.payments ?? []),
          issueDate: payment.invoice.issueDate.toISOString().slice(0, 10),
          customer: payment.invoice.customer,
        }
      : undefined,
  };
}

export async function GET(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const parsed = paymentListQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
    page: request.nextUrl.searchParams.get("page") ?? 1,
  });
  if (!parsed.success) return validationError(parsed.error);

  const { q, page } = parsed.data;
  const where = {
    ownerId: session!.user.id,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" as const } },
            { invoice: { invoiceNumber: { contains: q, mode: "insensitive" as const } } },
            { invoice: { customer: { name: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const [total, payments] = await db.$transaction([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        invoice: {
          include: {
            customer: true,
            payments: { where: { deletedAt: null } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    payments: payments.map(serializePayment),
  });
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = paymentMutationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const input = parsed.data;
  const invoice = await db.invoice.findFirst({
    where: {
      id: input.invoiceId,
      ownerId: session!.user.id,
      deletedAt: null,
      status: { in: ["POSTED", "PAID"] },
    },
    include: { payments: { where: { deletedAt: null } } },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Only posted invoices can receive payments." }, { status: 404 });
  }

  const outstanding = outstandingAmount(invoice.total, invoice.payments);
  if (outstanding <= 0) {
    return NextResponse.json({ error: "Invoice is already fully paid." }, { status: 400 });
  }
  if (roundMoney(input.amount) > outstanding) {
    return NextResponse.json({ error: `Payment exceeds outstanding balance of ${outstanding}.` }, { status: 400 });
  }

  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        ownerId: session!.user.id,
        invoiceId: invoice.id,
        amount: roundMoney(input.amount),
        method: input.method,
        paymentDate: new Date(input.paymentDate),
        reference: input.reference || null,
        notes: input.notes || null,
      },
      include: {
        invoice: {
          include: {
            customer: true,
            payments: { where: { deletedAt: null } },
          },
        },
      },
    });

    await postPaymentJournal(tx, {
      amount: payment.amount,
      id: payment.id,
      invoice: { invoiceNumber: invoice.invoiceNumber },
      ownerId: payment.ownerId,
      paymentDate: payment.paymentDate,
      reference: payment.reference,
    });

    const newOutstanding = outstandingAmount(invoice.total, [
      ...invoice.payments,
      { amount: roundMoney(input.amount), deletedAt: null },
    ]);

    if (newOutstanding <= 0 && invoice.status !== "PAID") {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "PAID", paidAt: new Date() },
      });
    }

    return { payment, newOutstanding };
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "PAYMENT_RECORDED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: {
      paymentId: result.payment.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: roundMoney(input.amount),
      method: input.method,
    },
  });

  if (result.newOutstanding <= 0) {
    await logAuditEvent({
      action: "INVOICE_PAID",
      email: session!.user.email,
      ip,
      userAgent,
      userId: session!.user.id,
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    });
  }

  const hydrated = await db.payment.findUniqueOrThrow({
    where: { id: result.payment.id },
    include: {
      invoice: {
        include: {
          customer: true,
          payments: { where: { deletedAt: null } },
        },
      },
    },
  });

  return NextResponse.json({ payment: serializePayment(hydrated) }, { status: 201 });
}
