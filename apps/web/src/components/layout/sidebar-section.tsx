"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { isRouteMatch, type NavigationGroup } from "@/lib/navigation";

export function SidebarSection({ group, pathname }: { group: NavigationGroup; pathname: string }) {
  const GroupIcon = group.icon;
  const groupActive = group.items.some((item) => isRouteMatch(pathname, item));

  return (
    <details className="group rounded-lg" open={groupActive || group.label === "Home"}>
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200">
        <span className="flex items-center gap-2">
          <GroupIcon className="h-4 w-4" />
          {group.label}
        </span>
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="sidebar-section-body mt-1 space-y-0.5 pl-3">
        {group.items.map((item) => {
          const Icon = item.icon;
          const active = isRouteMatch(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white",
                active && "bg-[#1D4ED8] text-white shadow-sm shadow-blue-950/20"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
