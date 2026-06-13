import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { VatReportClient } from "@/components/reports/VatReportClient";
import { getVatReport } from "@/lib/vat-report";

export const metadata: Metadata = { title: "VAT summary" };

export default async function VatReportPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const report = await getVatReport({ ownerId: session.user.id });

  return <VatReportClient initialReport={report} />;
}

