import { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--text-primary)] shadow-sm transition focus:border-[var(--primary-blue)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950", className)} {...props} />;
}
