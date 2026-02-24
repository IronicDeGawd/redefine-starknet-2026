"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] focus-visible:ring-[var(--primary)] shadow-sm",
        secondary:
          "bg-[var(--grey-100)] text-[var(--text-primary)] hover:bg-[var(--grey-200)] focus-visible:ring-[var(--grey-400)]",
        outline:
          "border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--grey-100)] hover:border-[var(--border-hover)] focus-visible:ring-[var(--primary)]",
        ghost:
          "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--grey-100)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--grey-400)]",
        danger:
          "bg-[var(--error)] text-white hover:bg-red-600 focus-visible:ring-[var(--error)]",
        success:
          "bg-[var(--success)] text-white hover:bg-[var(--success-dark)] focus-visible:ring-[var(--success)]",
        link: "text-[var(--primary)] underline-offset-4 hover:underline focus-visible:ring-[var(--primary)]",
      },
      size: {
        sm: "h-9 rounded-lg px-3 text-sm",
        md: "h-11 rounded-xl px-5 text-sm",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
