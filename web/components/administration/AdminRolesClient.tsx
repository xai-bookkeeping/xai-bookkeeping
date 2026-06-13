"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Permission = {
  action: string;
  description: string | null;
  id: string;
  key: string;
  module: string;
};

type AdminRole = {
  description: string | null;
  id: string;
  name: string;
  permissionIds: string[];
  permissionKeys: string[];
  status: string;
  systemRole: boolean;
  userCount: number;
};

const statuses = ["ACTIVE", "INACTIVE", "SYSTEM"];

function blankRole(): AdminRole {
  return {
    description: "",
    id: "",
    name: "_NEW_ROLE",
    permissionIds: [],
    permissionKeys: [],
    status: "ACTIVE",
    systemRole: false,
    userCount: 0,
  };
}

export function AdminRolesClient({
  initialRoles,
  permissions,
}: {
  initialRoles: AdminRole[];
  permissions: Permission[];
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [selectedId, setSelectedId] = useState(initialRoles[0]?.id ?? "new");
  const [draft, setDraft] = useState<AdminRole>(initialRoles[0] ?? blankRole());
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const modules = useMemo(() => [...new Set(permissions.map((permission) => permission.module))], [permissions]);

  function select(role: AdminRole | "new") {
    setMessage("");
    if (role === "new") {
      setSelectedId("new");
      setDraft(blankRole());
      return;
    }
    setSelectedId(role.id);
    setDraft({ ...role });
  }

  function togglePermission(permissionId: string) {
    setDraft((current) => ({
      ...current,
      permissionIds: current.permissionIds.includes(permissionId)
        ? current.permissionIds.filter((id) => id !== permissionId)
        : [...current.permissionIds, permissionId],
    }));
  }

  function save() {
    setMessage("");
    startTransition(async () => {
      const isNew = !draft.id;
      const response = await fetch(isNew ? "/api/administration/roles" : `/api/administration/roles/${draft.id}`, {
        body: JSON.stringify({
          description: draft.description,
          name: draft.name,
          permissionIds: draft.permissionIds,
          status: draft.status,
        }),
        headers: { "Content-Type": "application/json" },
        method: isNew ? "POST" : "PATCH",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(body.error ?? "Save failed.");
        return;
      }
      const saved: AdminRole = {
        description: body.role.description,
        id: body.role.id,
        name: body.role.name,
        permissionIds: body.role.permissions.map((item: { permissionId: string }) => item.permissionId),
        permissionKeys: body.role.permissions.map((item: { permission: { key: string } }) => item.permission.key),
        status: body.role.status,
        systemRole: body.role.systemRole,
        userCount: body.role.userAssignments?.length ?? draft.userCount,
      };
      setRoles((current) => isNew ? [...current, saved].sort((a, b) => a.name.localeCompare(b.name)) : current.map((role) => role.id === saved.id ? saved : role));
      setSelectedId(saved.id);
      setDraft(saved);
      setMessage("Role saved.");
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-950">Role definitions</h2>
            <p className="mt-1 text-sm text-slate-500">Open a role to customize privileges.</p>
          </div>
          <Button size="sm" onClick={() => select("new")}>Create role</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Open</th>
                <th className="px-4 py-3">Role Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Privileges</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((role) => (
                <tr key={role.id} className={selectedId === role.id ? "bg-sky-50/60" : "hover:bg-slate-50/70"}>
                  <td className="px-4 py-3"><button className="font-semibold text-sky-700" type="button" onClick={() => select(role)}>Edit</button></td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-950">{role.name}</td>
                  <td className="px-4 py-3 text-slate-600">{role.description ?? "No description"}</td>
                  <td className="px-4 py-3 text-slate-600">{role.status}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{role.userCount}</td>
                  <td className="px-4 py-3 text-slate-500">{role.permissionIds.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">{draft.id ? "Role editor" : "Create role"}</h2>
        <div className="mt-5 grid gap-3">
          <Input label="Role name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input label="Description" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            Status
            <select disabled={draft.systemRole} className="h-10 w-full rounded-xl border border-slate-200 px-3" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-950">Privileges</p>
            <div className="mt-3 max-h-[520px] space-y-4 overflow-auto pr-1">
              {modules.map((module) => (
                <div key={module}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{module}</p>
                  <div className="grid gap-2">
                    {permissions.filter((permission) => permission.module === module).map((permission) => (
                      <label key={permission.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2 text-sm hover:bg-slate-50">
                        <input type="checkbox" checked={draft.permissionIds.includes(permission.id)} onChange={() => togglePermission(permission.id)} />
                        <span>
                          <strong>{permission.key}</strong>
                          <span className="block text-xs text-slate-500">{permission.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {message ? <p className={message.includes("failed") || message.includes("exists") ? "text-sm font-semibold text-rose-600" : "text-sm font-semibold text-emerald-700"}>{message}</p> : null}
          <Button loading={isPending} onClick={save}>Save role</Button>
        </div>
      </section>
    </div>
  );
}
