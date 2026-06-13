import type { RuntimeFormConfig } from "@/lib/form-runtime";

export function formField(config: RuntimeFormConfig | null | undefined, fieldName: string, fallbackLabel: string) {
  const field = config?.fields.find((item) => item.fieldName === fieldName);
  return {
    defaultValue: field?.defaultValue ?? "",
    disabled: field?.entryMode === "DISPLAY_ONLY" || field?.allowUserEntry === false,
    hidden: field?.entryMode === "NOT_DISPLAYED",
    label: field?.fieldLabel ?? fallbackLabel,
    required: field?.entryMode === "MANDATORY",
  };
}
