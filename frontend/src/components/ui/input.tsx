import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-2xl border border-[color:var(--xb-border)] bg-white px-4 text-sm text-[var(--xb-ink)] outline-none transition placeholder:text-slate-400 focus:border-[color:var(--xb-accent)] focus:ring-2 focus:ring-[color:var(--xb-accent-soft)]",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
