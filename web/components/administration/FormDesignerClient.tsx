"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type FieldEntryMode = "USER_ENTRY" | "MANDATORY" | "DISPLAY_ONLY" | "NOT_DISPLAYED";
type FieldType = "TEXT" | "TEXTAREA" | "INTEGER" | "NUMBER" | "MONEY" | "BOOLEAN" | "DATE" | "DATE_TIME" | "EMAIL" | "PHONE" | "URL" | "LIST";

type FormField = {
  active: boolean;
  allowUserEntry: boolean;
  defaultValue: string | null;
  dependsOn: string | null;
  entryMode: FieldEntryMode;
  fieldLabel: string;
  fieldName: string;
  fieldType: FieldType;
  formula: string | null;
  groupTitle: string | null;
  hasFormula: boolean;
  id: string;
  listKey: string | null;
  resetToNull: boolean;
  scanField: boolean;
  sortOrder: number;
  systemField: boolean;
};

type FormTemplate = {
  active: boolean;
  description: string | null;
  fields: FormField[];
  id: string;
  key: string;
  name: string;
};

type ReferenceGroup = {
  id: string;
  key: string;
  name: string;
};

const entryModes: Array<{ label: string; value: FieldEntryMode }> = [
  { label: "User Entry", value: "USER_ENTRY" },
  { label: "Mandatory Entry", value: "MANDATORY" },
  { label: "Display Only", value: "DISPLAY_ONLY" },
  { label: "Not Displayed", value: "NOT_DISPLAYED" },
];

const fieldTypes: FieldType[] = ["TEXT", "TEXTAREA", "INTEGER", "NUMBER", "MONEY", "BOOLEAN", "DATE", "DATE_TIME", "EMAIL", "PHONE", "URL", "LIST"];

function newField(sortOrder: number): FormField {
  return {
    active: true,
    allowUserEntry: true,
    defaultValue: "",
    dependsOn: "",
    entryMode: "USER_ENTRY",
    fieldLabel: "New Field",
    fieldName: "newField",
    fieldType: "TEXT",
    formula: "",
    groupTitle: "custom",
    hasFormula: false,
    id: "",
    listKey: "",
    resetToNull: false,
    scanField: false,
    sortOrder,
    systemField: false,
  };
}

function labelForMode(mode: FieldEntryMode) {
  return entryModes.find((item) => item.value === mode)?.label ?? mode;
}

export function FormDesignerClient({
  initialTemplates,
  referenceGroups,
}: {
  initialTemplates: FormTemplate[];
  referenceGroups: ReferenceGroup[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplates[0]?.id ?? "");
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const sortedFields = useMemo(
    () => [...(selectedTemplate?.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.fieldLabel.localeCompare(b.fieldLabel)),
    [selectedTemplate],
  );
  const [selectedFieldId, setSelectedFieldId] = useState(sortedFields[0]?.id ?? "");
  const selectedField = sortedFields.find((field) => field.id === selectedFieldId) ?? sortedFields[0];
  const [draft, setDraft] = useState<FormField | null>(selectedField ? { ...selectedField } : null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function chooseTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    const field = [...(template?.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    setMessage("");
    setSelectedTemplateId(templateId);
    setSelectedFieldId(field?.id ?? "");
    setDraft(field ? { ...field } : null);
  }

  function chooseField(field: FormField) {
    setMessage("");
    setSelectedFieldId(field.id || "new");
    setDraft({ ...field });
  }

  function addField() {
    const nextSortOrder = Math.max(0, ...sortedFields.map((field) => field.sortOrder)) + 10;
    chooseField(newField(nextSortOrder));
  }

  function replaceField(field: FormField) {
    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              fields: template.fields.some((item) => item.id === field.id)
                ? template.fields.map((item) => (item.id === field.id ? field : item))
                : [...template.fields, field],
            }
          : template,
      ),
    );
    setSelectedFieldId(field.id);
    setDraft({ ...field });
  }

  function removeFieldFromState(fieldId: string) {
    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? { ...template, fields: template.fields.filter((field) => field.id !== fieldId) }
          : template,
      ),
    );
    const next = sortedFields.find((field) => field.id !== fieldId);
    setSelectedFieldId(next?.id ?? "");
    setDraft(next ? { ...next } : null);
  }

  function saveDraft() {
    if (!draft || !selectedTemplate) return;
    setMessage("");
    startTransition(async () => {
      const isNew = !draft.id;
      const response = await fetch(
        isNew
          ? `/api/administration/forms/${selectedTemplate.id}/fields`
          : `/api/administration/forms/${selectedTemplate.id}/fields/${draft.id}`,
        {
          body: JSON.stringify({
            ...draft,
            defaultValue: draft.defaultValue || null,
            dependsOn: draft.dependsOn || null,
            formula: draft.formula || null,
            groupTitle: draft.groupTitle || null,
            listKey: draft.fieldType === "LIST" ? draft.listKey || null : null,
          }),
          headers: { "Content-Type": "application/json" },
          method: isNew ? "POST" : "PATCH",
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(body.error ?? "Save failed.");
        return;
      }
      replaceField(body.field);
      setMessage(isNew ? "Field added." : "Field saved.");
    });
  }

  function deleteSelected() {
    if (!draft?.id || !selectedTemplate) return;
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/administration/forms/${selectedTemplate.id}/fields/${draft.id}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(body.error ?? "Remove failed.");
        return;
      }
      if (body.field?.active === false) {
        replaceField(body.field);
        setMessage("System field hidden.");
      } else {
        removeFieldFromState(draft.id);
        setMessage("Field removed.");
      }
    });
  }

  function move(direction: -1 | 1) {
    if (!draft?.id || !selectedTemplate) return;
    const index = sortedFields.findIndex((field) => field.id === draft.id);
    const other = sortedFields[index + direction];
    if (!other) return;
    const currentOrder = draft.sortOrder;
    const otherOrder = other.sortOrder;

    startTransition(async () => {
      const [currentResponse, otherResponse] = await Promise.all([
        fetch(`/api/administration/forms/${selectedTemplate.id}/fields/${draft.id}`, {
          body: JSON.stringify({ sortOrder: otherOrder }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        }),
        fetch(`/api/administration/forms/${selectedTemplate.id}/fields/${other.id}`, {
          body: JSON.stringify({ sortOrder: currentOrder }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        }),
      ]);
      if (!currentResponse.ok || !otherResponse.ok) {
        setMessage("Move failed.");
        return;
      }
      const currentBody = await currentResponse.json();
      const otherBody = await otherResponse.json();
      setTemplates((current) =>
        current.map((template) =>
          template.id === selectedTemplate.id
            ? {
                ...template,
                fields: template.fields.map((field) => {
                  if (field.id === currentBody.field.id) return currentBody.field;
                  if (field.id === otherBody.field.id) return otherBody.field;
                  return field;
                }),
              }
            : template,
        ),
      );
      setDraft({ ...currentBody.field });
      setSelectedFieldId(currentBody.field.id);
      setMessage("Field order updated.");
    });
  }

  if (!selectedTemplate) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No form templates are configured yet.</div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_420px]">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-950">Forms</h2>
        <div className="mt-4 grid gap-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => chooseTemplate(template.id)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition",
                selectedTemplate.id === template.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 hover:bg-slate-50",
              )}
            >
              <span className="block text-sm font-bold">{template.name}</span>
              <span className={cn("mt-1 block text-xs", selectedTemplate.id === template.id ? "text-slate-300" : "text-slate-500")}>
                {template.fields.length} fields
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-950">{selectedTemplate.name} fields</h2>
            <p className="mt-1 text-sm text-slate-500">{selectedTemplate.description}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={addField}><Plus className="h-4 w-4" /> Add</Button>
            <Button size="sm" variant="secondary" disabled={!draft?.id} onClick={() => move(-1)}><ArrowUp className="h-4 w-4" /> Up</Button>
            <Button size="sm" variant="secondary" disabled={!draft?.id} onClick={() => move(1)}><ArrowDown className="h-4 w-4" /> Down</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] text-left text-sm">
            <thead className="bg-white text-xs font-bold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Group Title</th>
                <th className="px-4 py-3">Field Name</th>
                <th className="px-4 py-3">Field Label</th>
                <th className="px-4 py-3">Entry Mode</th>
                <th className="px-4 py-3">Default Value</th>
                <th className="px-4 py-3">Has Formula</th>
                <th className="px-4 py-3">Scan Field</th>
                <th className="px-4 py-3">Depends On</th>
                <th className="px-4 py-3">List</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedFields.map((field) => (
                <tr
                  key={field.id}
                  onClick={() => chooseField(field)}
                  className={cn(
                    "cursor-pointer hover:bg-slate-50",
                    draft?.id === field.id && "bg-sky-50",
                    !field.active && "text-slate-400",
                  )}
                >
                  <td className="px-4 py-3">{field.groupTitle || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{field.fieldName}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{field.fieldLabel}</td>
                  <td className="px-4 py-3">{labelForMode(field.entryMode)}</td>
                  <td className="px-4 py-3">{field.defaultValue || "-"}</td>
                  <td className="px-4 py-3">{field.hasFormula ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{field.scanField ? "true" : "false"}</td>
                  <td className="px-4 py-3">{field.dependsOn || "-"}</td>
                  <td className="px-4 py-3">{field.listKey || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Field Properties</h2>
            <p className="mt-1 text-sm text-slate-500">{draft?.id ? draft.fieldName : "New configurable field"}</p>
          </div>
          {draft?.systemField ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">System</span> : null}
        </div>

        {draft ? (
          <div className="mt-5 grid gap-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-950">Entry Mode</p>
              <div className="mt-3 grid gap-2">
                {entryModes.map((mode) => (
                  <label key={mode.value} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      checked={draft.entryMode === mode.value}
                      onChange={() => setDraft({ ...draft, entryMode: mode.value })}
                    />
                    {mode.label}
                  </label>
                ))}
              </div>
            </div>

            <Input label="Field Name" value={draft.fieldName} onChange={(event) => setDraft({ ...draft, fieldName: event.target.value })} />
            <Input label="Field Label" value={draft.fieldLabel} onChange={(event) => setDraft({ ...draft, fieldLabel: event.target.value })} />
            <Input label="Group Title" value={draft.groupTitle ?? ""} onChange={(event) => setDraft({ ...draft, groupTitle: event.target.value })} />
            <Input label="Default Value" value={draft.defaultValue ?? ""} onChange={(event) => setDraft({ ...draft, defaultValue: event.target.value })} />
            <Input label="Formula" value={draft.formula ?? ""} onChange={(event) => setDraft({ ...draft, formula: event.target.value, hasFormula: Boolean(event.target.value.trim()) })} />

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Field Type
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3"
                value={draft.fieldType}
                onChange={(event) => setDraft({ ...draft, fieldType: event.target.value as FieldType })}
              >
                {fieldTypes.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Assigned List
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3"
                disabled={draft.fieldType !== "LIST"}
                value={draft.listKey ?? ""}
                onChange={(event) => setDraft({ ...draft, listKey: event.target.value })}
              >
                <option value="">No list</option>
                {referenceGroups.map((group) => <option key={group.id} value={group.key}>{group.name}</option>)}
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Depends On
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3"
                value={draft.dependsOn ?? ""}
                onChange={(event) => setDraft({ ...draft, dependsOn: event.target.value })}
              >
                <option value="">Nothing</option>
                {sortedFields.filter((field) => field.fieldName !== draft.fieldName).map((field) => (
                  <option key={field.id} value={field.fieldName}>{field.fieldLabel}</option>
                ))}
              </select>
            </label>

            <div className="grid gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.hasFormula} onChange={(event) => setDraft({ ...draft, hasFormula: event.target.checked })} />
                Has formula
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.scanField} onChange={(event) => setDraft({ ...draft, scanField: event.target.checked })} />
                Scan field
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.allowUserEntry} onChange={(event) => setDraft({ ...draft, allowUserEntry: event.target.checked })} />
                Allow user entry
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.resetToNull} onChange={(event) => setDraft({ ...draft, resetToNull: event.target.checked })} />
                Reset to null
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
                Active
              </label>
            </div>

            {message ? <p className={cn("text-sm font-semibold", message.toLowerCase().includes("failed") ? "text-rose-600" : "text-emerald-700")}>{message}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button loading={isPending} onClick={saveDraft}><Save className="h-4 w-4" /> Save Field</Button>
              <Button variant="danger" disabled={!draft.id || isPending} onClick={deleteSelected}><Trash2 className="h-4 w-4" /> Remove</Button>
            </div>
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-500">Select a field or add a new one.</p>
        )}
      </section>
    </div>
  );
}
