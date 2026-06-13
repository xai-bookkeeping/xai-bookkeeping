"use client";

import { cn } from "@/lib/cn";
import { getPasswordStrength } from "@/lib/validations";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

const checks = [
  { label: "At least 8 characters", test: (password: string) => password.length >= 8 },
  { label: "Recommended 12+ characters", test: (password: string) => password.length >= 12 },
  { label: "Uppercase letter (A-Z)", test: (password: string) => /[A-Z]/.test(password) },
  { label: "Lowercase letter (a-z)", test: (password: string) => /[a-z]/.test(password) },
  { label: "Number (0-9)", test: (password: string) => /[0-9]/.test(password) },
  {
    label: "Special character (!@#...)",
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
];

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  if (!password) return null;

  const { score, label, color } = getPasswordStrength(password);
  const pct = Math.min(100, score);

  return (
    <div className={cn("space-y-2.5", className)} aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full transition-all duration-500", color)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className={cn(
            "w-12 text-right text-xs font-semibold",
            score < 30
              ? "text-red-600"
              : score < 55
                ? "text-amber-600"
                : score < 75
                  ? "text-sky-600"
                  : "text-emerald-600",
          )}
        >
          {label}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-1">
        {checks.map((check) => {
          const passed = check.test(password);
          return (
            <li
              key={check.label}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                passed ? "text-emerald-600" : "text-slate-400",
              )}
            >
              <svg
                className="h-3.5 w-3.5 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                {passed ? (
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
              {check.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
