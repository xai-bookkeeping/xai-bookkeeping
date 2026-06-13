import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PartyImageControls } from "@/components/profile/PartyImageControls";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { db } from "@/lib/db";
import { initials, money, shortDate, timelineFromActivity } from "@/lib/profile-utils";

export const metadata: Metadata = { title: "Supplier profile" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SupplierProfilePage({ params }: Props) {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");
  const { id } = await params;

  const supplier = await db.supplier.findFirst({
    where: { id, ownerId: session.user.id, deletedAt: null },
    include: { expenses: { orderBy: { createdAt: "desc" } } },
  });
  if (!supplier) redirect("/suppliers");

  const activityRows = await db.activityLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { action: true, createdAt: true, email: true, metadata: true },
  });
  const activity = activityRows.filter((row) => JSON.stringify(row.metadata ?? {}).includes(supplier.id));
  const totalSpend = supplier.expenses
    .filter((expense) => ["APPROVED", "PAID"].includes(expense.status))
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
  const openBills = supplier.expenses.filter((expense) => ["DRAFT", "SUBMITTED", "APPROVED"].includes(expense.status)).length;
  const paidBills = supplier.expenses.filter((expense) => expense.status === "PAID").length;

  return (
    <ProfileShell
      actions={<PartyImageControls party="suppliers" recordId={supplier.id} />}
      avatar={
        supplier.logoUrl ? (
          <img src={supplier.logoUrl} alt="" className="h-full w-full object-contain p-2" />
        ) : (
          <span className="text-3xl font-black text-slate-950">{initials(supplier.name)}</span>
        )
      }
      coverImageUrl={supplier.coverImageUrl}
      createdAt={shortDate(supplier.createdAt)}
      metrics={[
        { label: "Total spend", value: money(totalSpend) },
        { label: "Open bills", value: String(openBills) },
        { label: "Paid bills", value: String(paidBills) },
        { label: "Expenses", value: String(supplier.expenses.length) },
      ]}
      name={supplier.name}
      status={supplier.trn ? "TRN Ready" : "No TRN"}
      subtitle={supplier.contactPerson || supplier.email || supplier.phone || "Supplier profile"}
      timeline={timelineFromActivity(activity)}
      updatedAt={shortDate(supplier.updatedAt)}
      tabs={[
        {
          label: "Overview",
          content: (
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <div><dt className="text-slate-400">Contact</dt><dd className="font-semibold text-slate-900">{supplier.contactPerson ?? "Not set"}</dd></div>
              <div><dt className="text-slate-400">Email</dt><dd className="font-semibold text-slate-900">{supplier.email ?? "Not set"}</dd></div>
              <div><dt className="text-slate-400">Phone</dt><dd className="font-semibold text-slate-900">{supplier.phone ?? "Not set"}</dd></div>
              <div><dt className="text-slate-400">TRN</dt><dd className="font-semibold text-slate-900">{supplier.trn ?? "Not set"}</dd></div>
              <div className="md:col-span-2"><dt className="text-slate-400">Address</dt><dd className="font-semibold text-slate-900">{supplier.address ?? "Not set"}</dd></div>
            </dl>
          ),
        },
        {
          label: "Related Records",
          content: (
            <div className="divide-y divide-slate-100">
              {supplier.expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold text-slate-900">{expense.category}</span>
                  <span className="text-slate-500">{money(Number(expense.amount))} | {expense.status}</span>
                </div>
              ))}
              {supplier.expenses.length === 0 ? <p className="text-sm text-slate-500">No expenses yet.</p> : null}
            </div>
          ),
        },
        { label: "Documents", content: <p className="text-sm text-slate-500">Supplier bills, contracts, PDFs, and attachments will appear here.</p> },
      ]}
    />
  );
}
