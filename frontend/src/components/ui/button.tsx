import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "border-transparent bg-[var(--xb-accent)] text-white shadow-[0_10px_24px_rgba(14,165,233,0.18)] hover:bg-sky-500",
  secondary:
    "border-[color:var(--xb-border)] bg-white text-[var(--xb-ink)] hover:bg-slate-50",
  outline:
    "border-[color:var(--xb-border)] bg-transparent text-[var(--xb-ink)] hover:bg-white",
  ghost: "border-transparent bg-transparent text-[var(--xb-ink)] hover:bg-white/70",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl border font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--xb-bg)] disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
