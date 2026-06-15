"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type RoleOption = { id: string; name: string; description: string | null };

type AdminUser = {
  id: string;
  createdAt: string;
  displayName: string | null;
  email: string;
  firstName: string;
  jobTitle: string | null;
  lastLoginAt: string | null;
  lastName: string;
  onboardingCompleted: boolean;
  phone: string | null;
  role: string;
  roleIds: string[];
  roleNames: string[];
  status: string;
  username: string | null;
};

const statuses = ["PENDING", "ACTIVE", "SUSPENDED", "DISABLED"];
const legacyRoles = ["ADMIN", "ACCOUNTANT", "APPROVER", "VIEWER"];

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("en-AE", { timeZone: "Asia/Dubai" }) : "Never";
}

export function AdminUsersClient({
  initialUsers,
  roles,
}: {
  initialUsers: AdminUser[];
  roles: RoleOption[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedId, setSelectedId] = useState(initialUsers[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const selected = users.find((user) => user.id === selectedId) ?? users[0];
  const [draft, setDraft] = useState<AdminUser | null>(selected ?? null);

  function selectUser(user: AdminUser) {
    setSelectedId(user.id);
    setDraft({ ...user });
    setMessage("");
  }

  function toggleRole(roleId: string) {
    if (!draft) return;
    const roleIds = draft.roleIds.includes(roleId)
      ? draft.roleIds.filter((id) => id !== roleId)
      : [...draft.roleIds, roleId];
    setDraft({ ...draft, roleIds });
  }

  const assignedNames = useMemo(() => {
    if (!draft) return [];
    return roles.filter((role) => draft.roleIds.includes(role.id)).map((role) => role.name);
  }, [draft, roles]);

  function save() {
    if (!draft) return;
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/users/${draft.id}`, {
        body: JSON.stringify({
          displayName: draft.displayName,
          email: draft.email,
          firstName: draft.firstName,
          jobTitle: draft.jobTitle,
          lastName: draft.lastName,
          onboardingCompleted: draft.onboardingCompleted,
          phone: draft.phone,
          role: draft.role,
          roleIds: draft.roleIds,
          status: draft.status,
          username: draft.username,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(body.error ?? "Update failed.");
        return;
      }
      const updated: AdminUser = {
        ...draft,
        createdAt: body.user.createdAt,
        lastLoginAt: body.user.lastLoginAt,
        roleNames: assignedNames,
      };
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
      setDraft(updated);
      setMessage("User saved.");
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h2 className="font-semibold text-slate-950">User table</h2>
          <p className="mt-1 text-sm text-slate-500">Open a user to edit details, flags, and assigned roles.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Open</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned Roles</th>
                <th className="px-4 py-3">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className={selectedId === user.id ? "bg-sky-50/60" : "hover:bg-slate-50/70"}>
                  <td className="px-4 py-3">
                    <button type="button" className="font-semibold text-sky-700" onClick={() => selectUser(user)}>Edit</button>
                    <Link href={`/users/${user.id}`} className="ml-3 font-semibold text-slate-500 hover:text-slate-900">Profile</Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{user.username ?? user.email.split("@")[0]}</td>
                  <td className="px-4 py-3 font-semibold text-slate-950">{user.displayName ?? `${user.firstName} ${user.lastName}`}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600">{user.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roleNames.map((role) => <span key={role} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{role}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(user.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {draft ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">User editor</h2>
              <p className="mt-1 text-sm text-slate-500">{draft.email}</p>
            </div>
            <Link href={`/users/${draft.id}`} className="text-sm font-semibold text-sky-700">Open profile</Link>
          </div>
          <div className="mt-5 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="First name" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
              <Input label="Last name" value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
              <Input label="Display name" value={draft.displayName ?? ""} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} />
              <Input label="Username" value={draft.username ?? ""} onChange={(e) => setDraft({ ...draft, username: e.target.value })} />
              <Input label="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              <Input label="Phone" value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              <Input label="Department / title" value={draft.jobTitle ?? ""} onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })} />
              <label className="space-y-1.5 text-sm font-medium text-slate-700">Status<select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">Primary role<select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>{legacyRoles.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <div className="grid gap-2 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">Flags</p>
              {[
                ["onboardingCompleted", "Onboarding completed"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={Boolean(draft[key as keyof AdminUser])} onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">Assigned roles</p>
              <div className="mt-3 grid max-h-64 gap-2 overflow-auto md:grid-cols-2">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={draft.roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
                    <span><strong>{role.name}</strong><span className="block text-xs text-slate-500">{role.description}</span></span>
                  </label>
                ))}
              </div>
            </div>
            {message ? <p className={message.includes("failed") || message.includes("already") ? "text-sm font-semibold text-rose-600" : "text-sm font-semibold text-emerald-700"}>{message}</p> : null}
            <Button loading={isPending} onClick={save}>Save user</Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
