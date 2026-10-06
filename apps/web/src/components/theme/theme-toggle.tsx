"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const modes: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor }
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const active = theme === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => setTheme(mode.value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition",
              active ? "border-[var(--primary-blue)] bg-blue-50 text-[var(--primary-blue)] dark:bg-blue-950/40" : "border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:border-[var(--primary-blue)]"
            )}
          >
            <Icon className="h-4 w-4" />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
