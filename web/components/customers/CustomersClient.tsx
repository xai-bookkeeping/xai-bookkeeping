"use client";

import { useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Building2, Mail, Phone, Search, Trash2, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formField } from "@/lib/form-client";
import type { RuntimeFormConfig } from "@/lib/form-runtime";

type Customer = {
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

type CustomersResponse = {
  customers: Customer[];
  page: number;
  pageSize: number;
  total: number;
};

type CustomerDraft = {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  trn: string;
};

const emptyDraft: CustomerDraft = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  trn: "",
};

function toDraft(customer: Customer): CustomerDraft {
  return {
    name: customer.name,
    contactPerson: customer.contactPerson ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    trn: customer.trn ?? "",
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

export function CustomersClient({ formConfig, initialData }: { formConfig: RuntimeFormConfig | null; initialData: CustomersResponse }) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Customer | null>(initialData.customers[0] ?? null);
  const [createDraft, setCreateDraft] = useState<CustomerDraft>(emptyDraft);
  const [editDraft, setEditDraft] = useState<CustomerDraft>(
    initialData.customers[0] ? toDraft(initialData.customers[0]) : emptyDraft,
  );
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const field = (name: keyof CustomerDraft, fallback: string) => formField(formConfig, name, fallback);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(page));

    startTransition(async () => {
      try {
        const next = await requestJson<CustomersResponse>(`/api/customers?${params.toString()}`);
        setData(next);
        setSelected((current) => {
          const nextSelected = current
            ? next.customers.find((customer) => customer.id === current.id)
            : next.customers[0];
          const resolved = nextSelected ?? next.customers[0] ?? null;
          setEditDraft(resolved ? toDraft(resolved) : emptyDraft);
          return resolved;
        });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Failed to load customers." });
      }
    });
  }, [page, query]);

  function selectCustomer(customer: Customer) {
    setSelected(customer);
    setEditDraft(toDraft(customer));
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await requestJson<{ customer: Customer }>("/api/customers", {
          method: "POST",
          body: JSON.stringify(createDraft),
        });
        setCreateDraft(emptyDraft);
        setData((current) => ({
          ...current,
          total: current.total + 1,
          customers: [result.customer, ...current.customers].slice(0, current.pageSize),
        }));
        setSelected(result.customer);
        setEditDraft(toDraft(result.customer));
        setNotice({ type: "success", text: "Customer created." });
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
        const result = await requestJson<{ customer: Customer }>(`/api/customers/${selected.id}`, {
          method: "PATCH",
          body: JSON.stringify(editDraft),
        });
        setData((current) => ({
          ...current,
          customers: current.customers.map((customer) =>
            customer.id === result.customer.id ? result.customer : customer,
          ),
        }));
        setSelected(result.customer);
        setEditDraft(toDraft(result.customer));
        setNotice({ type: "success", text: "Customer updated." });
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
        await requestJson<{ ok: true }>(`/api/customers/${selected.id}`, { method: "DELETE" });
        setData((current) => {
          const customers = current.customers.filter((customer) => customer.id !== selected.id);
          const nextSelected = customers[0] ?? null;
          setSelected(nextSelected);
          setEditDraft(nextSelected ? toDraft(nextSelected) : emptyDraft);
          return { ...current, total: Math.max(0, current.total - 1), customers };
        });
        setNotice({ type: "success", text: "Customer deleted." });
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
            Sales
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Customers
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Manage customer contact details, UAE TRNs, and invoice-ready billing information.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-right shadow-sm">
          <p className="text-2xl font-bold text-slate-950">{data.total}</p>
          <p className="text-xs font-medium text-slate-500">Active customers</p>
        </div>
      </div>

      {notice ? <Alert variant={notice.type === "success" ? "success" : "error"}>{notice.text}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <Input
              aria-label="Search customers"
              leftIcon={<Search className="h-4 w-4" />}
              placeholder="Search customer, contact, email, phone, or TRN"
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
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">TRN</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 font-semibold">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.customers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    className={cn(
                      "cursor-pointer transition hover:bg-slate-50",
                      selected?.id === customer.id && "bg-sky-50/70",
                    )}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">{customer.name}</p>
                          <p className="line-clamp-1 max-w-[260px] text-xs text-slate-500">
                            {customer.address || "No address"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{customer.contactPerson || "None"}</td>
                    <td className="px-4 py-4 text-slate-600">{customer.email || "None"}</td>
                    <td className="px-4 py-4 text-slate-600">{customer.phone || "None"}</td>
                    <td className="px-4 py-4 text-slate-600">{customer.trn || "None"}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(customer.updatedAt)}</td>
                    <td className="px-4 py-4">
                      <Link href={`/customers/${customer.id}`} onClick={(event) => event.stopPropagation()} className="font-semibold text-sky-700 hover:text-sky-800">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-sm text-slate-500">
                <Building2 className="h-8 w-8 text-slate-300" />
                No customers found.
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
              <UserRoundPlus className="h-5 w-5 text-sky-600" />
              <h2 className="font-semibold text-slate-950">Create customer</h2>
            </div>
            <form onSubmit={submitCreate} className="mt-5 space-y-4">
              {!field("name", "Customer name").hidden ? (
                <Input label={field("name", "Customer name").label} value={createDraft.name} onChange={(e) => setCreateDraft({ ...createDraft, name: e.target.value })} required={field("name", "Customer name").required} disabled={field("name", "Customer name").disabled} />
              ) : null}
              {!field("contactPerson", "Contact person").hidden ? (
                <Input label={field("contactPerson", "Contact person").label} value={createDraft.contactPerson} onChange={(e) => setCreateDraft({ ...createDraft, contactPerson: e.target.value })} required={field("contactPerson", "Contact person").required} disabled={field("contactPerson", "Contact person").disabled} />
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {!field("email", "Email").hidden ? (
                  <Input label={field("email", "Email").label} type="email" leftIcon={<Mail className="h-4 w-4" />} value={createDraft.email} onChange={(e) => setCreateDraft({ ...createDraft, email: e.target.value })} required={field("email", "Email").required} disabled={field("email", "Email").disabled} />
                ) : null}
                {!field("phone", "Phone").hidden ? (
                  <Input label={field("phone", "Phone").label} leftIcon={<Phone className="h-4 w-4" />} value={createDraft.phone} onChange={(e) => setCreateDraft({ ...createDraft, phone: e.target.value })} required={field("phone", "Phone").required} disabled={field("phone", "Phone").disabled} />
                ) : null}
              </div>
              {!field("trn", "TRN").hidden ? (
                <Input label={field("trn", "TRN").label} value={createDraft.trn} onChange={(e) => setCreateDraft({ ...createDraft, trn: e.target.value })} required={field("trn", "TRN").required} disabled={field("trn", "TRN").disabled} />
              ) : null}
              {!field("address", "Address").hidden ? (
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">{field("address", "Address").label}</span>
                  <textarea
                    value={createDraft.address}
                    required={field("address", "Address").required}
                    disabled={field("address", "Address").disabled}
                    onChange={(event) => setCreateDraft({ ...createDraft, address: event.target.value })}
                    className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </label>
              ) : null}
              <Button type="submit" loading={isPending} fullWidth>Create customer</Button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-semibold text-slate-950">Edit customer</h2>
                  <p className="mt-1 text-sm text-slate-500">Created {formatDate(selected.createdAt)}</p>
                </div>
                {!field("name", "Customer name").hidden ? (
                  <Input label={field("name", "Customer name").label} value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} required={field("name", "Customer name").required} disabled={field("name", "Customer name").disabled} />
                ) : null}
                {!field("contactPerson", "Contact person").hidden ? (
                  <Input label={field("contactPerson", "Contact person").label} value={editDraft.contactPerson} onChange={(e) => setEditDraft({ ...editDraft, contactPerson: e.target.value })} required={field("contactPerson", "Contact person").required} disabled={field("contactPerson", "Contact person").disabled} />
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  {!field("email", "Email").hidden ? (
                    <Input label={field("email", "Email").label} type="email" value={editDraft.email} onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })} required={field("email", "Email").required} disabled={field("email", "Email").disabled} />
                  ) : null}
                  {!field("phone", "Phone").hidden ? (
                    <Input label={field("phone", "Phone").label} value={editDraft.phone} onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })} required={field("phone", "Phone").required} disabled={field("phone", "Phone").disabled} />
                  ) : null}
                </div>
                {!field("trn", "TRN").hidden ? (
                  <Input label={field("trn", "TRN").label} value={editDraft.trn} onChange={(e) => setEditDraft({ ...editDraft, trn: e.target.value })} required={field("trn", "TRN").required} disabled={field("trn", "TRN").disabled} />
                ) : null}
                {!field("address", "Address").hidden ? (
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">{field("address", "Address").label}</span>
                    <textarea
                      value={editDraft.address}
                      required={field("address", "Address").required}
                      disabled={field("address", "Address").disabled}
                      onChange={(event) => setEditDraft({ ...editDraft, address: event.target.value })}
                      className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </label>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Button loading={isPending} onClick={submitEdit}>Save customer</Button>
                  <Button variant="danger" onClick={deleteSelected}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a customer to edit details.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
