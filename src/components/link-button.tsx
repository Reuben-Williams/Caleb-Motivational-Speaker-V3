import Link from "next/link";
import type { ReactNode } from "react";

type LinkButtonProps = {
  children: ReactNode;
  href: string;
  variant?: "gold" | "outline" | "text";
  className?: string;
};

export function LinkButton({
  children,
  href,
  variant = "gold",
  className = "",
}: LinkButtonProps) {
  const classes = `button button--${variant} ${className}`.trim();
  const external = !href.startsWith("/") && !href.startsWith("#");

  if (external) {
    return (
      <a
        className={classes}
        href={href}
        rel={href.startsWith("http") ? "noreferrer" : undefined}
        target={href.startsWith("http") ? "_blank" : undefined}
      >
        <span>{children}</span>
        <span aria-hidden="true">↗</span>
      </a>
    );
  }

  return (
    <Link className={classes} href={href}>
      <span>{children}</span>
      <span aria-hidden="true">↗</span>
    </Link>
  );
}
