"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const inputVariants = cva(
  "flex w-full rounded-xl border bg-white px-4 py-3 text-sm text-[var(--text-primary)] transition-all duration-200 placeholder:text-[var(--text-muted)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-[var(--border)] focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary-light)]",
        filled:
          "border-transparent bg-[var(--grey-100)] focus-visible:bg-white focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary-light)]",
        error:
          "border-[var(--error)] focus-visible:border-[var(--error)] focus-visible:ring-2 focus-visible:ring-[var(--error-light)]",
      },
      inputSize: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  }
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, inputSize, icon, iconPosition = "left", error, ...props }, ref) => {
    const effectiveVariant = error ? "error" : variant;

    if (icon) {
      return (
        <div className="relative">
          {iconPosition === "left" && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              inputVariants({ variant: effectiveVariant, inputSize }),
              iconPosition === "left" && "pl-11",
              iconPosition === "right" && "pr-11",
              className
            )}
            {...props}
          />
          {iconPosition === "right" && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {icon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        className={cn(inputVariants({ variant: effectiveVariant, inputSize, className }))}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input, inputVariants };
