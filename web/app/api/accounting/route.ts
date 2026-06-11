import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-utils";
import { getAccountingOverview, seedDefaultAccounts } from "@/lib/accounting";

export async function GET() {
  const { error, session } = await requireUser();
  if (error) return error;

  const overview = await getAccountingOverview(session!.user.id);
  return NextResponse.json(overview);
}

export async function POST() {
  const { error, session } = await requireUser();
  if (error) return error;

  await seedDefaultAccounts(session!.user.id);
  const overview = await getAccountingOverview(session!.user.id);
  return NextResponse.json(overview, { status: 201 });
}

