import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card({ className, ...props }, ref) {
  return <div ref={ref} className={cn("rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-panel transition-colors", className)} {...props} />;
});
