import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { db } from "@/lib/db";
import { money, shortDate, timelineFromActivity } from "@/lib/profile-utils";

export const metadata: Metadata = { title: "Invoice profile" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoiceProfilePage({ params }: Props) {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");
  const { id } = await params;

  const invoice = await db.invoice.findFirst({
    where: { id, ownerId: session.user.id, deletedAt: null },
    include: {
      approvedBy: { select: { email: true, firstName: true, lastName: true } },
      customer: true,
      lines: { orderBy: { sortOrder: "asc" } },
      payments: { where: { deletedAt: null }, orderBy: { paymentDate: "desc" } },
      postedBy: { select: { email: true, firstName: true, lastName: true } },
    },
  });
  if (!invoice) redirect("/invoices");

  const activityRows = await db.activityLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { action: true, createdAt: true, email: true, metadata: true },
  });
  const activity = activityRows.filter((row) => JSON.stringify(row.metadata ?? {}).includes(invoice.id) || JSON.stringify(row.metadata ?? {}).includes(invoice.invoiceNumber));
  const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstanding = Math.max(0, Number(invoice.total) - paid);

  return (
    <ProfileShell
      avatar={<FileText className="h-12 w-12 text-[var(--primary-color,#0ea5e9)]" />}
      createdAt={shortDate(invoice.createdAt)}
      metrics={[
        { label: "Total", value: money(Number(invoice.total)) },
        { label: "VAT", value: money(Number(invoice.vatTotal)) },
        { label: "Paid", value: money(paid) },
        { label: "Outstanding", value: money(outstanding) },
      ]}
      name={invoice.invoiceNumber}
      status={invoice.status}
      subtitle={`${invoice.customer.name} | Issue date ${shortDate(invoice.issueDate)}`}
      timeline={timelineFromActivity(activity)}
      updatedAt={shortDate(invoice.updatedAt)}
      actions={<Link href="/invoices" className="rounded-xl bg-[var(--primary-color,#0ea5e9)] px-4 py-2 text-sm font-semibold text-white">Back to invoices</Link>}
      tabs={[
        {
          label: "Overview",
          content: (
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <div><dt className="text-slate-400">Customer</dt><dd className="font-semibold text-slate-900"><Link href={`/customers/${invoice.customerId}`}>{invoice.customer.name}</Link></dd></div>
              <div><dt className="text-slate-400">Due date</dt><dd className="font-semibold text-slate-900">{shortDate(invoice.dueDate)}</dd></div>
              <div><dt className="text-slate-400">Approved by</dt><dd className="font-semibold text-slate-900">{invoice.approvedBy ? `${invoice.approvedBy.firstName} ${invoice.approvedBy.lastName}` : "Not approved"}</dd></div>
              <div><dt className="text-slate-400">Posted by</dt><dd className="font-semibold text-slate-900">{invoice.postedBy ? `${invoice.postedBy.firstName} ${invoice.postedBy.lastName}` : "Not posted"}</dd></div>
              <div className="md:col-span-2"><dt className="text-slate-400">Notes</dt><dd className="font-semibold text-slate-900">{invoice.notes ?? "No notes"}</dd></div>
            </dl>
          ),
        },
        {
          label: "Related Records",
          content: (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900">Line items</p>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {invoice.lines.map((line) => (
                    <div key={line.id} className="grid gap-2 p-3 text-sm md:grid-cols-[1fr_auto]">
                      <span className="font-semibold text-slate-900">{line.description}</span>
                      <span className="text-slate-500">{Number(line.quantity)} x {money(Number(line.unitPrice))} = {money(Number(line.lineTotal))}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900">Payments</p>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 text-sm">
                      <span className="font-semibold text-slate-900">{payment.method}</span>
                      <span className="text-slate-500">{money(Number(payment.amount))} | {shortDate(payment.paymentDate)}</span>
                    </div>
                  ))}
                  {invoice.payments.length === 0 ? <p className="p-3 text-sm text-slate-500">No payments recorded.</p> : null}
                </div>
              </div>
            </div>
          ),
        },
        { label: "Documents", content: <p className="text-sm text-slate-500">Invoice PDFs, emails, receipts, and supporting documents will appear here.</p> },
      ]}
    />
  );
}
