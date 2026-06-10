"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Mail, RefreshCw, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type ManagedRole = "ADMIN" | "ACCOUNTANT" | "APPROVER" | "VIEWER";
type ManagedStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DISABLED";

type ManagedUser = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  username: string | null;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  role: ManagedRole | "USER";
  status: ManagedStatus;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type UsersResponse = {
  page: number;
  pageSize: number;
  total: number;
  users: ManagedUser[];
};

const roles: ManagedRole[] = ["ADMIN", "ACCOUNTANT", "APPROVER", "VIEWER"];
const statuses: ManagedStatus[] = ["PENDING", "ACTIVE", "SUSPENDED", "DISABLED"];

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function fullName(user: ManagedUser) {
  return user.displayName || `${user.firstName} ${user.lastName}`.trim();
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

export function UsersClient({ initialData }: { initialData: UsersResponse }) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ManagedUser | null>(initialData.users[0] ?? null);
  const [mode, setMode] = useState<"invite" | "create">("invite");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "ACCOUNTANT" as ManagedRole,
    status: "ACTIVE" as ManagedStatus,
    phone: "",
    jobTitle: "",
  });

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    params.set("page", String(page));

    startTransition(async () => {
      try {
        const next = await requestJson<UsersResponse>(`/api/users?${params.toString()}`);
        setData(next);
        setSelected((current) => {
          if (!current) return next.users[0] ?? null;
          return next.users.find((user) => user.id === current.id) ?? next.users[0] ?? null;
        });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Failed to load users." });
      }
    });
  }, [page, query, role, status]);

  const counts = useMemo(
    () => ({
      active: data.users.filter((user) => user.status === "ACTIVE").length,
      admins: data.users.filter((user) => user.role === "ADMIN").length,
    }),
    [data.users],
  );

  function resetDraft() {
    setDraft({
      email: "",
      firstName: "",
      lastName: "",
      role: "ACCOUNTANT",
      status: "ACTIVE",
      phone: "",
      jobTitle: "",
    });
  }

  function submitNewUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const endpoint = mode === "invite" ? "/api/users/invite" : "/api/users";
    startTransition(async () => {
      try {
        await requestJson(endpoint, { method: "POST", body: JSON.stringify(draft) });
        resetDraft();
        setNotice({
          type: "success",
          text: mode === "invite" ? "Invitation sent." : "User created and password setup email sent.",
        });
        const next = await requestJson<UsersResponse>("/api/users");
        setData(next);
        setSelected(next.users[0] ?? null);
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not save user." });
      }
    });
  }

  function updateSelected(patch: Partial<ManagedUser>) {
    if (!selected) return;
    setSelected({ ...selected, ...patch });
  }

  function saveSelected() {
    if (!selected) return;
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await requestJson<{ user: ManagedUser }>(`/api/users/${selected.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            firstName: selected.firstName,
            lastName: selected.lastName,
            displayName: selected.displayName,
            username: selected.username,
            phone: selected.phone,
            jobTitle: selected.jobTitle,
            role: selected.role === "USER" ? "ACCOUNTANT" : selected.role,
            status: selected.status,
          }),
        });
        setData((current) => ({
          ...current,
          users: current.users.map((user) => (user.id === result.user.id ? result.user : user)),
        }));
        setSelected(result.user);
        setNotice({ type: "success", text: "User updated." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Update failed." });
      }
    });
  }

  function sendAction(path: string, success: string) {
    setNotice(null);
    startTransition(async () => {
      try {
        await requestJson(path, { method: "POST" });
        setNotice({ type: "success", text: success });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Action failed." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            User management
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Invite teammates, assign roles, manage access, and review account state.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-lg font-bold text-slate-950">{data.total}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-lg font-bold text-emerald-700">{counts.active}</p>
            <p className="text-xs text-slate-500">Active page</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-lg font-bold text-sky-700">{counts.admins}</p>
            <p className="text-xs text-slate-500">Admins page</p>
          </div>
        </div>
      </div>

      {notice ? <Alert variant={notice.type === "success" ? "success" : "error"}>{notice.text}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_170px_170px]">
            <Input
              aria-label="Search users"
              leftIcon={<Search className="h-4 w-4" />}
              placeholder="Search name, username, or email"
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
            />
            <select
              value={role}
              onChange={(event) => {
                setPage(1);
                setRole(event.target.value);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
              aria-label="Filter by role"
            >
              <option value="">All roles</option>
              {roles.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Verified</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Last login</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelected(user)}
                    className={cn(
                      "cursor-pointer transition hover:bg-slate-50",
                      selected?.id === user.id && "bg-sky-50/70",
                    )}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sm font-bold text-sky-700">
                          {(user.firstName[0] ?? "X") + (user.lastName[0] ?? "B")}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">{fullName(user)}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                          {user.username ? <p className="text-xs text-slate-400">@{user.username}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-700">{user.role}</td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "rounded-full px-2 py-1 text-xs font-semibold",
                        user.status === "ACTIVE" && "bg-emerald-50 text-emerald-700",
                        user.status === "PENDING" && "bg-amber-50 text-amber-700",
                        user.status === "SUSPENDED" && "bg-orange-50 text-orange-700",
                        user.status === "DISABLED" && "bg-slate-100 text-slate-500",
                      )}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{user.emailVerified ? "Yes" : "No"}</td>
                    <td className="px-4 py-4 text-slate-600">{user.phone || "None"}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.users.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-sm text-slate-500">
                <Users className="h-8 w-8 text-slate-300" />
                No users match your filters.
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
            <div className="flex gap-2">
              <Button size="sm" variant={mode === "invite" ? "primary" : "secondary"} onClick={() => setMode("invite")}>
                <Mail className="h-4 w-4" /> Invite
              </Button>
              <Button size="sm" variant={mode === "create" ? "primary" : "secondary"} onClick={() => setMode("create")}>
                <UserPlus className="h-4 w-4" /> Create
              </Button>
            </div>
            <form onSubmit={submitNewUser} className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="First name" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} required />
                <Input label="Last name" value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} required />
              </div>
              <Input label="Email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} required />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Role
                  <select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as ManagedRole })}>
                    {roles.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                {mode === "create" ? (
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Status
                    <select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ManagedStatus })}>
                      {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                ) : null}
              </div>
              {mode === "create" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                  <Input label="Job title" value={draft.jobTitle} onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })} />
                </div>
              ) : null}
              <Button type="submit" loading={isPending} fullWidth>
                {mode === "invite" ? "Send invitation" : "Create user"}
              </Button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 font-bold text-sky-700">
                    {(selected.firstName[0] ?? "X") + (selected.lastName[0] ?? "B")}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-950">{fullName(selected)}</h2>
                    <p className="text-sm text-slate-500">{selected.email}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="First name" value={selected.firstName} onChange={(e) => updateSelected({ firstName: e.target.value })} />
                  <Input label="Last name" value={selected.lastName} onChange={(e) => updateSelected({ lastName: e.target.value })} />
                  <Input label="Display name" value={selected.displayName ?? ""} onChange={(e) => updateSelected({ displayName: e.target.value })} />
                  <Input label="Username" value={selected.username ?? ""} onChange={(e) => updateSelected({ username: e.target.value })} />
                  <Input label="Phone" value={selected.phone ?? ""} onChange={(e) => updateSelected({ phone: e.target.value })} />
                  <Input label="Job title" value={selected.jobTitle ?? ""} onChange={(e) => updateSelected({ jobTitle: e.target.value })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Role
                    <select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={selected.role === "USER" ? "ACCOUNTANT" : selected.role} onChange={(e) => updateSelected({ role: e.target.value as ManagedRole })}>
                      {roles.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Status
                    <select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={selected.status} onChange={(e) => updateSelected({ status: e.target.value as ManagedStatus })}>
                      {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  <span>Verified: <strong>{selected.emailVerified ? "Yes" : "No"}</strong></span>
                  <span>Last login: <strong>{formatDate(selected.lastLoginAt)}</strong></span>
                </div>
                <div className="grid gap-2">
                  <Button loading={isPending} onClick={saveSelected}>
                    <ShieldCheck className="h-4 w-4" /> Save user
                  </Button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="secondary" onClick={() => sendAction(`/api/users/${selected.id}/reset-password`, "Password setup email sent.")}>
                      <RefreshCw className="h-4 w-4" /> Reset
                    </Button>
                    <Button variant="secondary" onClick={() => sendAction(`/api/users/${selected.id}/resend-verification`, "Verification email sent.")}>
                      <Mail className="h-4 w-4" /> Verify
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a user to edit account access.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
