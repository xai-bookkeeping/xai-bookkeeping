import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CustomersClient } from "@/components/customers/CustomersClient";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 12;

export default async function CustomersPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const [total, customers] = await db.$transaction([
    db.customer.count({
      where: { ownerId: session.user.id, deletedAt: null },
    }),
    db.customer.findMany({
      where: { ownerId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
  ]);

  return (
    <CustomersClient
      initialData={{
        customers: customers.map((customer) => ({
          ...customer,
          createdAt: customer.createdAt.toISOString(),
          updatedAt: customer.updatedAt.toISOString(),
          deletedAt: customer.deletedAt?.toISOString() ?? null,
        })),
        page: 1,
        pageSize: PAGE_SIZE,
        total,
      }}
    />
  );
}
