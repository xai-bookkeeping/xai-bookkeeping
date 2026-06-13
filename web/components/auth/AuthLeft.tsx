import type { ReactNode } from "react";

interface Feature {
  text: string;
}

interface AuthLeftProps {
  headline: string;
  subline: string;
  features?: Feature[];
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  );
}

export function AuthLeft({ headline, subline, features }: AuthLeftProps) {
  return (
    <div className="relative hidden lg:flex lg:w-[52%] flex-col overflow-hidden bg-slate-950">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-sky-600/20 blur-[120px]" />
        <div className="absolute top-1/2 right-0 h-[400px] w-[400px] rounded-full bg-sky-900/25 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[400px] rounded-full bg-slate-900/60 blur-[80px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative flex h-full flex-col px-14 py-12">
        {/* Logo */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-sm font-black text-white shadow-lg shadow-sky-500/30">
            XB
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            <span className="text-sky-400">X</span>AI Books
          </span>
        </div>

        {/* Main content */}
        <div className="mt-auto mb-auto pt-16">
          <h1 className="max-w-[400px] text-[2.4rem] font-bold leading-[1.12] tracking-tight text-white">
            {headline}
          </h1>
          <p className="mt-5 max-w-[360px] text-base leading-relaxed text-slate-400">
            {subline}
          </p>

          {features && features.length > 0 && (
            <ul className="mt-10 space-y-3">
              {features.map((f) => (
                <li key={f.text} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-sm text-slate-300 leading-relaxed">{f.text}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Stats strip */}
          <div className="mt-12 flex gap-10 border-t border-white/10 pt-8">
            {[
              { val: "5%", label: "UAE VAT automatic" },
              { val: "AED", label: "TRN-ready by default" },
              { val: "SOC 2", label: "Grade audit trail" },
            ].map((s) => (
              <div key={s.val}>
                <div className="text-2xl font-bold text-white tracking-tight">{s.val}</div>
                <div className="mt-0.5 text-xs text-slate-500 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-600">
          Federal Tax Authority compliant &nbsp;·&nbsp; DIFC-registered infrastructure
        </p>
      </div>
    </div>
  );
}
