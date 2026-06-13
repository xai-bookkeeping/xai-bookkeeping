"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";

type QueryResult = Record<string, unknown>[];

export function SqlConsole({ initialSql }: { initialSql: string }) {
  const [sql, setSql] = useState(initialSql);
  const [rows, setRows] = useState<QueryResult>([]);
  const [error, setError] = useState("");
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [affectedRows, setAffectedRows] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const columns = useMemo(() => Object.keys(rows[0] ?? {}), [rows]);

  function execute() {
    setError("");
    setDurationMs(null);
    setAffectedRows(null);
    startTransition(async () => {
      const response = await fetch("/api/administration/sql", {
        body: JSON.stringify({ sql }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setRows([]);
        setError(body.error ?? "Query failed.");
        return;
      }
      setRows(body.rows ?? []);
      setDurationMs(body.durationMs ?? null);
      setAffectedRows(typeof body.affectedRows === "number" ? body.affectedRows : null);
    });
  }

  function exportCsv() {
    if (rows.length === 0) return;
    const csv = [
      columns.join(","),
      ...rows.map((row) => columns.map((column) => JSON.stringify(row[column] ?? "")).join(",")),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `xai-sql-results-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-300 bg-slate-100 px-3 py-2">
        <div>
          <h2 className="font-semibold text-slate-950">Query Window</h2>
          <p className="mt-0.5 text-xs text-slate-500">Single SELECT, INSERT, UPDATE, and DELETE statements. Schema/admin commands are blocked.</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
          <span className="rounded border border-slate-300 bg-white px-2 py-1">File</span>
          <span className="rounded border border-slate-300 bg-white px-2 py-1">Edit</span>
          <span className="rounded border border-slate-300 bg-white px-2 py-1">Query</span>
        </div>
      </div>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <Button type="button" size="sm" loading={isPending} onClick={execute}>Run</Button>
        <Button type="button" size="sm" variant="secondary" onClick={exportCsv} disabled={rows.length === 0}>Export</Button>
        <span className="ml-auto text-xs text-slate-500">
          {durationMs !== null ? `${durationMs} ms` : "Ready"}
          {affectedRows !== null ? ` | ${affectedRows} row(s) affected` : rows.length > 0 ? ` | ${rows.length} row(s)` : ""}
        </span>
      </div>
      <div className="space-y-4 p-3">
        <textarea
          value={sql}
          onChange={(event) => setSql(event.target.value)}
          spellCheck={false}
          className="min-h-60 w-full resize-y rounded border border-slate-400 bg-white p-4 font-mono text-sm text-blue-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {affectedRows !== null ? `${affectedRows} row(s) affected` : durationMs !== null ? `${rows.length} rows in ${durationMs} ms` : "Ready"}
            {error ? <span className="ml-3 font-semibold text-rose-600">{error}</span> : null}
          </div>
        </div>
      </div>
      <div className="max-h-[520px] overflow-auto border-t border-slate-300">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-sky-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50/70">
                {columns.map((column) => (
                  <td key={column} className="max-w-72 truncate px-4 py-3 font-mono text-xs text-slate-700">
                    {String(row[column] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
