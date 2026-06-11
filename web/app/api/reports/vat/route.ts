import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-utils";
import { getVatReport } from "@/lib/vat-report";

export async function GET(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const report = await getVatReport({
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    ownerId: session!.user.id,
    to: request.nextUrl.searchParams.get("to") ?? undefined,
  });

  return NextResponse.json(report);
}

