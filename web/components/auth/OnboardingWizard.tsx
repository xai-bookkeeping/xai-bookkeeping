"use client";

import { useRef, useState, useTransition } from "react";
import { Building2, CheckCircle2, FileText, ImageIcon } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

const steps = [
  { id: 1, label: "Company", icon: Building2 },
  { id: 2, label: "TRN", icon: FileText },
  { id: 3, label: "Logo", icon: ImageIcon },
  { id: 4, label: "Finish", icon: CheckCircle2 },
];

type OnboardingWizardProps = {
  initialCompanyName: string;
  initialTaxNumber: string;
};

export function OnboardingWizard({
  initialCompanyName,
  initialTaxNumber,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [taxNumber, setTaxNumber] = useState(initialTaxNumber);
  const [logo, setLogo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);

  function canContinue() {
    if (step === 1) return companyName.trim().length > 1;
    return true;
  }

  function nextStep() {
    setError(null);
    if (!canContinue()) {
      setError("Company name is required.");
      return;
    }
    setStep((current) => Math.min(current + 1, 4));
  }

  function finish() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/onboarding", {
        body: JSON.stringify({
          companyName,
          taxNumber,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Onboarding failed.");
        return;
      }

      if (logo) {
        const form = new FormData();
        form.set("file", logo);
        const upload = await fetch("/api/account/company-logo", {
          body: form,
          method: "POST",
        });
        const uploadBody = await upload.json().catch(() => ({}));
        if (!upload.ok) {
          setError(uploadBody.error ?? "Company logo upload failed.");
          return;
        }
      }

      window.location.assign("/dashboard");
    });
  }

  return (
    <div className="flex min-h-dvh w-full bg-slate-50">
      <section className="hidden min-h-dvh w-[42%] flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500 text-sm font-black">
            XB
          </div>
          <div>
            <p className="text-lg font-black">XAI Books</p>
            <p className="text-sm text-slate-400">UAE finance workspace</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">
            Google signup complete
          </p>
          <h1 className="mt-4 max-w-xl text-5xl font-black tracking-tight">
            Let&apos;s set up your company profile.
          </h1>
          <p className="mt-5 max-w-md text-lg text-slate-300">
            These details appear on invoices, VAT records, and your workspace header.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-8 text-sm text-slate-300">
          <div><span className="text-2xl font-black text-white">AED</span><p>Currency ready</p></div>
          <div><span className="text-2xl font-black text-white">5%</span><p>VAT defaults</p></div>
          <div><span className="text-2xl font-black text-white">TRN</span><p>Invoice ready</p></div>
        </div>
      </section>

      <main className="flex min-h-dvh flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-8 flex items-center justify-between gap-3">
            {steps.map((item) => {
              const Icon = item.icon;
              const active = step === item.id;
              const done = step > item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => done && setStep(item.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
                    active && "bg-sky-50 text-sky-700",
                    done && "bg-emerald-50 text-emerald-700",
                    !active && !done && "bg-slate-50 text-slate-400",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}

          <div className="mt-5 min-h-72">
            {step === 1 ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">Company name</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Use the legal or trading name customers should see on your documents.
                  </p>
                </div>
                <Input
                  autoFocus
                  label="Company name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Lumen Interiors LLC"
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">Tax Registration Number</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Add your TRN now, or leave it blank and fill it from Settings later.
                  </p>
                </div>
                <Input
                  autoFocus
                  label="TRN number"
                  value={taxNumber}
                  onChange={(event) => setTaxNumber(event.target.value)}
                  placeholder="100000000000003"
                />
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">Company logo</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Upload a PNG, JPG, or SVG logo. You can skip this and add it later.
                  </p>
                </div>
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <input
                    ref={logoInputRef}
                    hidden
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
                  />
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    {logo ? logo.name : "No logo selected"}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    Choose logo
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">Finish setup</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Review the basics. You can refine everything from Settings later.
                  </p>
                </div>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  <div className="flex justify-between gap-4 p-4 text-sm">
                    <span className="text-slate-500">Company</span>
                    <span className="font-semibold text-slate-900">{companyName || "Not set"}</span>
                  </div>
                  <div className="flex justify-between gap-4 p-4 text-sm">
                    <span className="text-slate-500">TRN</span>
                    <span className="font-semibold text-slate-900">{taxNumber || "Not set"}</span>
                  </div>
                  <div className="flex justify-between gap-4 p-4 text-sm">
                    <span className="text-slate-500">Logo</span>
                    <span className="font-semibold text-slate-900">{logo ? logo.name : "Not set"}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 1 || isPending}
              onClick={() => setStep((current) => Math.max(current - 1, 1))}
            >
              Back
            </Button>
            {step < 4 ? (
              <Button type="button" onClick={nextStep}>
                Continue
              </Button>
            ) : (
              <Button type="button" loading={isPending} onClick={finish}>
                Finish setup
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
