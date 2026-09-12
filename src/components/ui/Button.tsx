import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-teal-600 text-white shadow-sm hover:bg-teal-700 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400",
  secondary:
    "border border-zinc-300 text-zinc-800 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900",
  ghost: "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900",
  danger: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

function classes(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className ?? ""}`;
}

/** A `<button>` styled to match the app's button system. */
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

/** A Next.js `<Link>` styled identically to Button, for navigational CTAs. */
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  target,
}: CommonProps & { href: string; target?: string }) {
  return (
    <Link href={href} target={target} className={classes(variant, size, className)}>
      {children}
    </Link>
  );
}
