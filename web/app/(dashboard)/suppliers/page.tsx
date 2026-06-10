import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SuppliersClient } from "@/components/suppliers/SuppliersClient";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Suppliers" };

const PAGE_SIZE = 12;

export default async function SuppliersPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const [total, suppliers] = await db.$transaction([
    db.supplier.count({
      where: { ownerId: session.user.id, deletedAt: null },
    }),
    db.supplier.findMany({
      where: { ownerId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
  ]);

  return (
    <SuppliersClient
      initialData={{
        page: 1,
        pageSize: PAGE_SIZE,
        total,
        suppliers: suppliers.map((supplier) => ({
          ...supplier,
          createdAt: supplier.createdAt.toISOString(),
          updatedAt: supplier.updatedAt.toISOString(),
          deletedAt: supplier.deletedAt?.toISOString() ?? null,
        })),
      }}
    />
  );
}
