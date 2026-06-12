import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { db } from "@/lib/db";
import { initials, money, shortDate, timelineFromActivity } from "@/lib/profile-utils";

export const metadata: Metadata = { title: "Company profile" };

export default async function CompanyProfilePage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const ownerId = session.user.id;
  const [
    user,
    users,
    customers,
    suppliers,
    invoices,
    expenses,
    activity,
  ] = await db.$transaction([
    db.user.findUnique({ where: { id: ownerId }, include: { company: true } }),
    db.user.count(),
    db.customer.count({ where: { ownerId, deletedAt: null } }),
    db.supplier.count({ where: { ownerId, deletedAt: null } }),
    db.invoice.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, invoiceNumber: true, status: true, total: true },
    }),
    db.expense.findMany({
      where: { ownerId, deletedAt: null },
      select: { amount: true, status: true },
    }),
    db.activityLog.findMany({
      where: { userId: ownerId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { action: true, createdAt: true, email: true, metadata: true },
    }),
  ]);

  if (!user) redirect("/login");
  const company = user.company;
  const name = company?.name ?? user.companyName ?? "XAI Books workspace";
  const revenue = invoices
    .filter((invoice) => ["APPROVED", "POSTED", "PAID"].includes(invoice.status))
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const expenseTotal = expenses
    .filter((expense) => ["APPROVED", "PAID"].includes(expense.status))
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  return (
    <ProfileShell
      avatar={company?.logoUrl ? <img src={company.logoUrl} alt="" className="h-full w-full object-contain p-2" /> : <span className="text-3xl font-black text-slate-950">{initials(name)}</span>}
      coverImageUrl={company?.coverImageUrl}
      createdAt={shortDate(company?.createdAt ?? user.createdAt)}
      metrics={[
        { label: "Revenue", value: money(revenue, company?.currency ?? "AED") },
        { label: "Expenses", value: money(expenseTotal, company?.currency ?? "AED") },
        { label: "Users", value: String(users) },
        { label: "Customers", value: String(customers), helper: `${suppliers} suppliers` },
      ]}
      name={name}
      status={company?.taxNumber ? "TRN Ready" : "TRN Not Set"}
      subtitle={company?.taxNumber ? `TRN ${company.taxNumber}` : "Company workspace profile"}
      timeline={timelineFromActivity(activity)}
      updatedAt={shortDate(company?.updatedAt ?? user.updatedAt)}
      actions={<Link href="/settings" className="rounded-xl bg-[var(--primary-color,#0ea5e9)] px-4 py-2 text-sm font-semibold text-white">Edit branding</Link>}
      tabs={[
        {
          label: "Overview",
          content: (
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <div><dt className="text-slate-400">Website</dt><dd className="font-semibold text-slate-900">{company?.website ?? "Not set"}</dd></div>
              <div><dt className="text-slate-400">Email</dt><dd className="font-semibold text-slate-900">{company?.email ?? user.email}</dd></div>
              <div><dt className="text-slate-400">Phone</dt><dd className="font-semibold text-slate-900">{company?.phone ?? "Not set"}</dd></div>
              <div><dt className="text-slate-400">Currency</dt><dd className="font-semibold text-slate-900">{company?.currency ?? "AED"}</dd></div>
            </dl>
          ),
        },
        {
          label: "Related Records",
          content: (
            <div className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold text-slate-900">{invoice.invoiceNumber}</span>
                  <span className="text-slate-500">{invoice.status}</span>
                </Link>
              ))}
              {invoices.length === 0 ? <p className="text-sm text-slate-500">No invoices yet.</p> : null}
            </div>
          ),
        },
        {
          label: "Documents",
          content: <p className="text-sm text-slate-500">Company certificates, VAT documents, PDFs, and attachments will appear here.</p>,
        },
      ]}
    />
  );
}
