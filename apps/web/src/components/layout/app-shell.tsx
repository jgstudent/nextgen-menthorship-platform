"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2, LogOut, Menu } from "lucide-react";
import { AccessDenied } from "@/components/auth/access-denied";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/auth-provider";
import { roleLabel } from "@/lib/permissions";
import { canAccessPath, visibleNavigationGroups } from "@/lib/navigation";
import { SidebarSection } from "@/components/layout/sidebar-section";
import { api } from "@/lib/api";
import type { Organization } from "@/types/domain";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const hideShell = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || Boolean(pathname?.startsWith("/apply/mentorship/"));
  const { data: organizations } = useQuery({ queryKey: ["organizations", "shell"], queryFn: () => api<Organization[]>("/organizations"), enabled: Boolean(user) });
  const organization = organizations?.[0];
  const enabledAddOns = organization?.enabledAddOns ?? [];
  const navGroups = visibleNavigationGroups(user?.role, enabledAddOns);
  const hasAccess = canAccessPath(pathname, user?.role, enabledAddOns);

  if (hideShell) {
    return children;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] transition-colors">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-[var(--sidebar-navy)] lg:block">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <div>
            <div className="flex items-center gap-3">
              {organization?.logoUrl ? (
                <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-md border border-white/15 bg-white/5 shadow-sm">
                  <img src={organization.logoUrl} alt={`${organization.displayName ?? organization.name} logo`} className="h-full w-full object-cover" />
                </span>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-[#10B981] shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#10B981]">NextGen</p>
                <h1 className="text-lg font-bold text-white">Empowerment Hub</h1>
              </div>
            </div>
            <div className="ml-[52px] mt-2 h-0.5 w-20 rounded-full bg-[#D4A017]" />
          </div>
        </div>
        <nav className="space-y-2 overflow-y-auto p-3.5">
          {navGroups.map((group) => <SidebarSection key={group.label} group={group} pathname={pathname ?? ""} />)}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
          <div className="h-1 bg-gradient-to-r from-[#1D4ED8] via-[#10B981] to-[#D4A017]" />
          <div className="flex h-16 items-center justify-between px-4 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Workspace</p>
              <p className="font-semibold text-[var(--text-primary)]">NextGen Haitian Empowerment, Inc.</p>
            </div>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{user.firstName} {user.lastName}</p>
                  <span className="mt-0.5 inline-flex rounded-full border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-medium leading-none text-[var(--text-secondary)] opacity-85">{roleLabel(user.role)}</span>
                </div>
                <Avatar user={user} size="sm" />
                <button type="button" onClick={logout} className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]">
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]">
                Sign in
              </Link>
            )}
          </div>
          <div className="border-t border-[var(--border)] px-4 py-3 lg:hidden">
            <details className="rounded-md border border-[var(--border)] bg-[var(--card)]">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                <span className="inline-flex items-center gap-2"><Menu className="h-4 w-4" /> Navigation</span>
                <span className="text-xs text-[var(--text-secondary)]">{navGroups.length} sections</span>
              </summary>
              <nav className="space-y-2 border-t border-[var(--border)] bg-[var(--sidebar-navy)] p-3">
                {navGroups.map((group) => <SidebarSection key={group.label} group={group} pathname={pathname ?? ""} />)}
              </nav>
            </details>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8 xl:px-10">{hasAccess ? children : <AccessDenied />}</main>
      </div>
    </div>
  );
}
