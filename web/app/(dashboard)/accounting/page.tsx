import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountingClient } from "@/components/accounting/AccountingClient";
import { getAccountingOverview } from "@/lib/accounting";

export const metadata: Metadata = { title: "Accounting" };

export default async function AccountingPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const overview = await getAccountingOverview(session.user.id);

  return <AccountingClient initialOverview={overview} />;
}

