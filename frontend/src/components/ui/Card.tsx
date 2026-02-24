"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "gradient";
  interactive?: boolean;
  glow?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", interactive = false, glow = false, children, ...props }, ref) => {
    const variants = {
      default: "bg-[var(--bg-tertiary)]",
      elevated: "bg-[var(--bg-elevated)] shadow-lg",
      outlined: "bg-transparent border border-[var(--border-default)]",
      gradient: "bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)]",
    };

    return (
      <div
        ref={ref}
        className={cn(
          `
          rounded-xl
          border border-[var(--border-subtle)]
          transition-all duration-200
        `,
          variants[variant],
          interactive && "cursor-pointer hover:border-[var(--border-hover)] hover:shadow-xl hover:-translate-y-0.5",
          glow && "shadow-[0_0_30px_var(--accent-glow)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pb-0", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-5 pt-0 flex items-center gap-3", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";
