import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PartyImageControls } from "@/components/profile/PartyImageControls";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { db } from "@/lib/db";
import { initials, money, shortDate, timelineFromActivity } from "@/lib/profile-utils";

export const metadata: Metadata = { title: "Customer profile" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CustomerProfilePage({ params }: Props) {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");
  const { id } = await params;

  const customer = await db.customer.findFirst({
    where: { id, ownerId: session.user.id, deletedAt: null },
    include: { invoices: { include: { payments: { where: { deletedAt: null } } }, orderBy: { createdAt: "desc" } } },
  });
  if (!customer) redirect("/customers");

  const activityRows = await db.activityLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { action: true, createdAt: true, email: true, metadata: true },
  });
  const activity = activityRows.filter((row) => JSON.stringify(row.metadata ?? {}).includes(customer.id));

  const revenue = customer.invoices
    .filter((invoice) => ["APPROVED", "POSTED", "PAID"].includes(invoice.status))
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const outstanding = customer.invoices.reduce((sum, invoice) => {
    const paid = invoice.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0);
    return sum + Math.max(0, Number(invoice.total) - paid);
  }, 0);
  const paidInvoices = customer.invoices.filter((invoice) => invoice.status === "PAID").length;
  const openInvoices = customer.invoices.filter((invoice) => ["DRAFT", "SUBMITTED", "APPROVED", "POSTED"].includes(invoice.status)).length;

  return (
    <ProfileShell
      actions={<PartyImageControls party="customers" recordId={customer.id} />}
      avatar={
        customer.logoUrl ? (
          <img src={customer.logoUrl} alt="" className="h-full w-full object-contain p-2" />
        ) : (
          <span className="text-3xl font-black text-slate-950">{initials(customer.name)}</span>
        )
      }
      coverImageUrl={customer.coverImageUrl}
      createdAt={shortDate(customer.createdAt)}
      metrics={[
        { label: "Revenue", value: money(revenue) },
        { label: "Outstanding", value: money(outstanding) },
        { label: "Paid invoices", value: String(paidInvoices) },
        { label: "Open invoices", value: String(openInvoices) },
      ]}
      name={customer.name}
      status={customer.trn ? "TRN Ready" : "No TRN"}
      subtitle={customer.contactPerson || customer.email || customer.phone || "Customer profile"}
      timeline={timelineFromActivity(activity)}
      updatedAt={shortDate(customer.updatedAt)}
      tabs={[
        {
          label: "Overview",
          content: (
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <div><dt className="text-slate-400">Contact</dt><dd className="font-semibold text-slate-900">{customer.contactPerson ?? "Not set"}</dd></div>
              <div><dt className="text-slate-400">Email</dt><dd className="font-semibold text-slate-900">{customer.email ?? "Not set"}</dd></div>
              <div><dt className="text-slate-400">Phone</dt><dd className="font-semibold text-slate-900">{customer.phone ?? "Not set"}</dd></div>
              <div><dt className="text-slate-400">TRN</dt><dd className="font-semibold text-slate-900">{customer.trn ?? "Not set"}</dd></div>
              <div className="md:col-span-2"><dt className="text-slate-400">Address</dt><dd className="font-semibold text-slate-900">{customer.address ?? "Not set"}</dd></div>
            </dl>
          ),
        },
        {
          label: "Related Records",
          content: (
            <div className="divide-y divide-slate-100">
              {customer.invoices.map((invoice) => (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold text-slate-900">{invoice.invoiceNumber}</span>
                  <span className="text-slate-500">{money(Number(invoice.total))} | {invoice.status}</span>
                </Link>
              ))}
              {customer.invoices.length === 0 ? <p className="text-sm text-slate-500">No invoices yet.</p> : null}
            </div>
          ),
        },
        { label: "Documents", content: <p className="text-sm text-slate-500">Customer contracts, tax documents, PDFs, and attachments will appear here.</p> },
      ]}
    />
  );
}
