import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminDataTable, AdminPageHeader, AdminTabBar } from "@/components/administration/AdminShell";
import { SqlConsole } from "@/components/administration/SqlConsole";
import { ensureAdminDefaults } from "@/lib/admin-defaults";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Database explorer" };

type TableRow = {
  table_name: string;
  row_estimate: bigint;
};

export default async function DatabaseExplorerPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  await ensureAdminDefaults();

  const tables = await db.$queryRaw<TableRow[]>`
    SELECT c.relname AS table_name, c.reltuples::bigint AS row_estimate
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname LIKE 'xb_%'
    ORDER BY c.relname
  `;

  const history = await db.sqlQueryHistory.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Database Explorer"
        description="SQL Server Management Studio-style database browsing. Stage 1 is read-only with audited SELECT queries."
      />
      <AdminTabBar />
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <AdminDataTable title="Tables" description="Public XAI Books tables.">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Rows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tables.map((table) => (
                  <tr key={table.table_name} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-950">{table.table_name}</td>
                    <td className="px-4 py-3 text-slate-500">{table.row_estimate.toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminDataTable>
          <AdminDataTable title="Query History">
            <table className="min-w-full text-left text-sm">
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-slate-700">{item.sqlText.slice(0, 80)}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.status} | {item.rowCount} rows</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminDataTable>
        </div>
        <SqlConsole initialSql="SELECT * FROM xb_users LIMIT 50" />
      </div>
    </div>
  );
}
