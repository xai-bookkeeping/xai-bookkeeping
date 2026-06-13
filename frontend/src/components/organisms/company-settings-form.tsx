import { useEffect, useState } from "react";
import type { CompanySettingsResponse, CompanySettingsUpdateRequest } from "@/api";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/components/ui";

type ValidationErrors = Partial<Record<keyof CompanySettingsUpdateRequest, string>>;

function validate(values: CompanySettingsUpdateRequest): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!values.legal_name.trim()) {
    errors.legal_name = "Legal name is required.";
  }
  if (!values.business_activity.trim()) {
    errors.business_activity = "Business activity is required.";
  }
  if (values.trn && !/^\d{15}$/.test(values.trn)) {
    errors.trn = "TRN must be 15 digits.";
  }

  return errors;
}

export function CompanySettingsForm({
  feedbackMessage,
  initialValues,
  isSubmitting = false,
  onSubmit,
}: {
  feedbackMessage: string | null;
  initialValues: CompanySettingsResponse;
  isSubmitting?: boolean;
  onSubmit: (values: CompanySettingsUpdateRequest) => Promise<void> | void;
}) {
  const [values, setValues] = useState<CompanySettingsUpdateRequest>({
    business_activity: initialValues.business_activity ?? "",
    legal_name: initialValues.legal_name,
    registered_address: initialValues.registered_address ?? "",
    trn: initialValues.trn ?? "",
    vat_registration_status: initialValues.vat_registration_status,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    setValues({
      business_activity: initialValues.business_activity ?? "",
      legal_name: initialValues.legal_name,
      registered_address: initialValues.registered_address ?? "",
      trn: initialValues.trn ?? "",
      vat_registration_status: initialValues.vat_registration_status,
    });
    setErrors({});
  }, [initialValues]);

  return (
    <Card>
      <CardHeader>
        <Badge tone="accent" className="w-fit">
          UAE company profile
        </Badge>
        <CardTitle>Company settings</CardTitle>
        <CardDescription>
          Keep legal identity, VAT status, and registered address aligned with this company.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {feedbackMessage ? (
          <div className="rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] px-4 py-3 text-sm text-[var(--xb-ink)]">
            {feedbackMessage}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-[var(--xb-ink)]">Legal name</span>
            <Input
              aria-label="Legal name"
              onChange={(event) => setValues((current) => ({ ...current, legal_name: event.target.value }))}
              value={values.legal_name}
            />
            {errors.legal_name ? <p className="text-sm text-red-700">{errors.legal_name}</p> : null}
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-[var(--xb-ink)]">Business activity</span>
            <Input
              aria-label="Business activity"
              onChange={(event) =>
                setValues((current) => ({ ...current, business_activity: event.target.value }))
              }
              value={values.business_activity}
            />
            {errors.business_activity ? (
              <p className="text-sm text-red-700">{errors.business_activity}</p>
            ) : null}
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-[var(--xb-ink)]">TRN</span>
            <Input
              aria-label="TRN"
              onChange={(event) => setValues((current) => ({ ...current, trn: event.target.value }))}
              value={values.trn ?? ""}
            />
            <p className="text-sm text-[var(--xb-muted)]">UAE Tax Registration Number</p>
            {errors.trn ? <p className="text-sm text-red-700">{errors.trn}</p> : null}
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-[var(--xb-ink)]">VAT status</span>
            <select
              aria-label="VAT status"
              className="flex h-11 w-full rounded-2xl border border-[color:var(--xb-border)] bg-white px-4 text-sm text-[var(--xb-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-accent)]"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  vat_registration_status: event.target.value as CompanySettingsUpdateRequest["vat_registration_status"],
                }))
              }
              value={values.vat_registration_status}
            >
              <option value="registered">registered</option>
              <option value="not_registered">not_registered</option>
            </select>
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-[var(--xb-ink)]">Registered address</span>
          <textarea
            aria-label="Registered address"
            className="min-h-28 w-full rounded-2xl border border-[color:var(--xb-border)] bg-white px-4 py-3 text-sm text-[var(--xb-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-accent)]"
            onChange={(event) =>
              setValues((current) => ({ ...current, registered_address: event.target.value }))
            }
            value={values.registered_address ?? ""}
          />
        </label>

        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-[var(--xb-ink)]">Default currency</span>
            <Input aria-label="Default currency" readOnly value={initialValues.default_currency} />
          </label>
          <div className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--xb-ink)]">VAT default</span>
            <div className="rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] px-4 py-3 text-sm text-[var(--xb-ink)]">
              {initialValues.default_vat_rate}% UAE VAT
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            onClick={() => {
              setValues({
                business_activity: initialValues.business_activity ?? "",
                legal_name: initialValues.legal_name,
                registered_address: initialValues.registered_address ?? "",
                trn: initialValues.trn ?? "",
                vat_registration_status: initialValues.vat_registration_status,
              });
              setErrors({});
            }}
            variant="secondary"
          >
            Discard changes
          </Button>
          <Button
            onClick={async () => {
              const nextErrors = validate(values);
              setErrors(nextErrors);
              if (Object.keys(nextErrors).length > 0) {
                return;
              }
              try {
                await onSubmit(values);
              } catch {
                // Route-level feedback handles backend denial and validation responses.
              }
            }}
          >
            {isSubmitting ? "Saving changes..." : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
