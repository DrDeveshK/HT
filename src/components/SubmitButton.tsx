"use client";

import { useFormStatus } from "react-dom";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "sm";

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn(buttonClasses(variant, size), className)}>
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}
