"use client";

import { forwardRef, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightElement,
      containerClassName,
      className,
      type,
      id,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;
    const inputProps = {
      ...props,
      value: props.value === null ? "" : props.value,
    };

    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            type={inputType}
            className={cn(
              "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition",
              "placeholder:text-slate-400",
              "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15",
              error
                ? "border-red-400 focus:border-red-400 focus:ring-red-400/15"
                : "border-slate-200 hover:border-slate-300",
              leftIcon && "pl-9",
              (isPassword || rightElement) && "pr-10",
              className,
            )}
            {...inputProps}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          {rightElement && !isPassword && (
            <div className="absolute inset-y-0 right-3 flex items-center">{rightElement}</div>
          )}
        </div>
        {error && (
          <p role="alert" className="flex items-center gap-1 text-xs text-red-600">
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
