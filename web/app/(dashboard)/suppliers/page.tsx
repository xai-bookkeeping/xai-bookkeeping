import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SuppliersClient } from "@/components/suppliers/SuppliersClient";
import { db } from "@/lib/db";
import { getRuntimeFormConfig } from "@/lib/form-runtime";

export const metadata: Metadata = { title: "Suppliers" };

const PAGE_SIZE = 12;

export default async function SuppliersPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const [total, suppliers, formConfig] = await Promise.all([
    db.supplier.count({
      where: { ownerId: session.user.id, deletedAt: null },
    }),
    db.supplier.findMany({
      where: { ownerId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    getRuntimeFormConfig("suppliers"),
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
      formConfig={formConfig}
    />
  );
}
