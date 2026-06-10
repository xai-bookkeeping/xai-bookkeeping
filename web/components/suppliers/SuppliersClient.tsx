"use client";

import { useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Mail, Phone, Search, Store, Trash2, Truck } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type Supplier = {
  id: string;
  ownerId: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  trn: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type SuppliersResponse = {
  suppliers: Supplier[];
  page: number;
  pageSize: number;
  total: number;
};

type SupplierDraft = {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  trn: string;
};

const emptyDraft: SupplierDraft = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  trn: "",
};

function toDraft(supplier: Supplier): SupplierDraft {
  return {
    name: supplier.name,
    contactPerson: supplier.contactPerson ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    address: supplier.address ?? "",
    trn: supplier.trn ?? "",
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

export function SuppliersClient({ initialData }: { initialData: SuppliersResponse }) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Supplier | null>(initialData.suppliers[0] ?? null);
  const [createDraft, setCreateDraft] = useState<SupplierDraft>(emptyDraft);
  const [editDraft, setEditDraft] = useState<SupplierDraft>(
    initialData.suppliers[0] ? toDraft(initialData.suppliers[0]) : emptyDraft,
  );
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(page));

    startTransition(async () => {
      try {
        const next = await requestJson<SuppliersResponse>(`/api/suppliers?${params.toString()}`);
        setData(next);
        setSelected((current) => {
          const nextSelected = current
            ? next.suppliers.find((supplier) => supplier.id === current.id)
            : next.suppliers[0];
          const resolved = nextSelected ?? next.suppliers[0] ?? null;
          setEditDraft(resolved ? toDraft(resolved) : emptyDraft);
          return resolved;
        });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Failed to load suppliers." });
      }
    });
  }, [page, query]);

  function selectSupplier(supplier: Supplier) {
    setSelected(supplier);
    setEditDraft(toDraft(supplier));
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await requestJson<{ supplier: Supplier }>("/api/suppliers", {
          method: "POST",
          body: JSON.stringify(createDraft),
        });
        setCreateDraft(emptyDraft);
        setData((current) => ({
          ...current,
          total: current.total + 1,
          suppliers: [result.supplier, ...current.suppliers].slice(0, current.pageSize),
        }));
        setSelected(result.supplier);
        setEditDraft(toDraft(result.supplier));
        setNotice({ type: "success", text: "Supplier created." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Create failed." });
      }
    });
  }

  function submitEdit() {
    if (!selected) return;
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await requestJson<{ supplier: Supplier }>(`/api/suppliers/${selected.id}`, {
          method: "PATCH",
          body: JSON.stringify(editDraft),
        });
        setData((current) => ({
          ...current,
          suppliers: current.suppliers.map((supplier) =>
            supplier.id === result.supplier.id ? result.supplier : supplier,
          ),
        }));
        setSelected(result.supplier);
        setEditDraft(toDraft(result.supplier));
        setNotice({ type: "success", text: "Supplier updated." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Update failed." });
      }
    });
  }

  function deleteSelected() {
    if (!selected) return;
    const confirmed = window.confirm(`Delete ${selected.name}?`);
    if (!confirmed) return;
    setNotice(null);
    startTransition(async () => {
      try {
        await requestJson<{ ok: true }>(`/api/suppliers/${selected.id}`, { method: "DELETE" });
        setData((current) => {
          const suppliers = current.suppliers.filter((supplier) => supplier.id !== selected.id);
          const nextSelected = suppliers[0] ?? null;
          setSelected(nextSelected);
          setEditDraft(nextSelected ? toDraft(nextSelected) : emptyDraft);
          return { ...current, total: Math.max(0, current.total - 1), suppliers };
        });
        setNotice({ type: "success", text: "Supplier deleted." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Delete failed." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
            Purchasing
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Suppliers
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Manage supplier contacts, UAE TRNs, and expense-ready billing information.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-right shadow-sm">
          <p className="text-2xl font-bold text-slate-950">{data.total}</p>
          <p className="text-xs font-medium text-slate-500">Active suppliers</p>
        </div>
      </div>

      {notice ? <Alert variant={notice.type === "success" ? "success" : "error"}>{notice.text}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <Input
              aria-label="Search suppliers"
              leftIcon={<Search className="h-4 w-4" />}
              placeholder="Search supplier, contact, email, phone, or TRN"
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[840px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">TRN</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    onClick={() => selectSupplier(supplier)}
                    className={cn(
                      "cursor-pointer transition hover:bg-slate-50",
                      selected?.id === supplier.id && "bg-sky-50/70",
                    )}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">{supplier.name}</p>
                          <p className="line-clamp-1 max-w-[260px] text-xs text-slate-500">
                            {supplier.address || "No address"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{supplier.contactPerson || "None"}</td>
                    <td className="px-4 py-4 text-slate-600">{supplier.email || "None"}</td>
                    <td className="px-4 py-4 text-slate-600">{supplier.phone || "None"}</td>
                    <td className="px-4 py-4 text-slate-600">{supplier.trn || "None"}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(supplier.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.suppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-sm text-slate-500">
                <Store className="h-8 w-8 text-slate-300" />
                No suppliers found.
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1 || isPending} onClick={() => setPage((value) => value - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages || isPending} onClick={() => setPage((value) => value + 1)}>
                Next
              </Button>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-sky-600" />
              <h2 className="font-semibold text-slate-950">Create supplier</h2>
            </div>
            <form onSubmit={submitCreate} className="mt-5 space-y-4">
              <Input label="Supplier name" value={createDraft.name} onChange={(e) => setCreateDraft({ ...createDraft, name: e.target.value })} required />
              <Input label="Contact person" value={createDraft.contactPerson} onChange={(e) => setCreateDraft({ ...createDraft, contactPerson: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Email" type="email" leftIcon={<Mail className="h-4 w-4" />} value={createDraft.email} onChange={(e) => setCreateDraft({ ...createDraft, email: e.target.value })} />
                <Input label="Phone" leftIcon={<Phone className="h-4 w-4" />} value={createDraft.phone} onChange={(e) => setCreateDraft({ ...createDraft, phone: e.target.value })} />
              </div>
              <Input label="TRN" value={createDraft.trn} onChange={(e) => setCreateDraft({ ...createDraft, trn: e.target.value })} />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Address</span>
                <textarea
                  value={createDraft.address}
                  onChange={(event) => setCreateDraft({ ...createDraft, address: event.target.value })}
                  className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
                />
              </label>
              <Button type="submit" loading={isPending} fullWidth>Create supplier</Button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-semibold text-slate-950">Edit supplier</h2>
                  <p className="mt-1 text-sm text-slate-500">Created {formatDate(selected.createdAt)}</p>
                </div>
                <Input label="Supplier name" value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} required />
                <Input label="Contact person" value={editDraft.contactPerson} onChange={(e) => setEditDraft({ ...editDraft, contactPerson: e.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Email" type="email" value={editDraft.email} onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })} />
                  <Input label="Phone" value={editDraft.phone} onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })} />
                </div>
                <Input label="TRN" value={editDraft.trn} onChange={(e) => setEditDraft({ ...editDraft, trn: e.target.value })} />
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Address</span>
                  <textarea
                    value={editDraft.address}
                    onChange={(event) => setEditDraft({ ...editDraft, address: event.target.value })}
                    className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
                  />
                </label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Button loading={isPending} onClick={submitEdit}>Save supplier</Button>
                  <Button variant="danger" onClick={deleteSelected}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a supplier to edit details.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
