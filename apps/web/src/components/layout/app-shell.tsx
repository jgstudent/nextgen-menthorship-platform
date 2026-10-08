"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, BookOpenCheck, ClipboardList, Clock3, ExternalLink, GraduationCap, LayoutDashboard, LogOut, Menu, Sparkles, UsersRound } from "lucide-react";
import { AccessDenied } from "@/components/auth/access-denied";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/auth-provider";
import { canPreviewMentorship, roleLabel } from "@/lib/permissions";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Organization } from "@/types/domain";

type PilyeLink = { href: string; label: string; icon: ComponentType<{ className?: string }>; exact?: boolean };

const classroomLinks: PilyeLink[] = [
  { href: "/my-mentorship", label: "My classroom", icon: GraduationCap, exact: true }
];

const staffLinks: PilyeLink[] = [
  { href: "/programs/mentorship", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/programs/mentorship/applications", label: "Applications", icon: ClipboardList },
  { href: "/programs/mentorship/participants", label: "People", icon: UsersRound },
  { href: "/programs/mentorship/matching", label: "Matching", icon: Sparkles },
  { href: "/programs/mentorship/engagement", label: "Classrooms", icon: Activity },
  { href: "/programs/mentorship/resources", label: "Learning library", icon: BookOpenCheck },
  { href: "/programs/mentorship/service-hours", label: "Service hours", icon: Clock3 },
  { href: "/programs/mentorship/monitoring", label: "Progress & reports", icon: BarChart3 }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const hideShell = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || Boolean(pathname?.startsWith("/apply/mentorship/"));
  const organizationsQuery = useQuery({
    queryKey: ["organizations", "pilye-shell"],
    queryFn: () => api<Organization[]>("/organizations"),
    enabled: Boolean(user && !hideShell)
  });

  if (hideShell) return children;

  const organization = organizationsQuery.data?.[0];
  const hasPilye = organization?.enabledAddOns?.includes("MENTORSHIP") ?? false;
  const isStaff = canPreviewMentorship(user?.role);
  const links = isStaff ? [...classroomLinks, ...staffLinks] : classroomLinks;
  const inPilye = pathname === "/my-mentorship" || Boolean(pathname?.startsWith("/my-mentorship/")) || pathname === "/programs/mentorship" || Boolean(pathname?.startsWith("/programs/mentorship/"));
  const potayUrl = process.env.NEXT_PUBLIC_POTAY_URL ?? "https://portal.nextgenhaitian.org";

  return (
    <div className="pilye-product min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-[var(--sidebar-navy)] px-4 py-6 text-white lg:flex">
        <Link href={isStaff ? "/programs/mentorship" : "/my-mentorship"} className="flex items-center gap-3 px-3 pb-6 text-white">
          <PilyeMark />
          <span className="flex flex-col"><strong className="font-serif text-3xl leading-none tracking-tight">Pilye</strong><small className="mt-1 text-[11px] tracking-wide text-[#bcd2ca]">Learning together</small></span>
        </Link>

        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1b96a] font-extrabold text-[#173c36]">{isStaff ? "P" : "N"}</span>
          <span className="min-w-0"><small className="block text-[10px] uppercase tracking-[0.12em] text-[#bcd2ca]">{isStaff ? "Educator console" : "My classroom"}</small><strong className="mt-0.5 block truncate text-sm">{organization?.displayName ?? organization?.name ?? "NextGen Scholars"}</strong></span>
        </div>

        <nav className="space-y-1 overflow-y-auto">{links.map((item) => <PilyeNavLink key={item.href} item={item} pathname={pathname ?? ""} />)}</nav>

        <div className="mt-auto rounded-2xl bg-white/[0.06] p-4">
          <p className="text-xs font-semibold text-white">A safe place to keep growing.</p>
          <p className="mt-1 text-[11px] leading-5 text-[#bcd2ca]">Questions, practice, and small steps all belong here.</p>
        </div>
        <a href={potayUrl} className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#bcd2ca] transition hover:text-white"><ExternalLink className="h-4 w-4" /> Return to Potay</a>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
          <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <details className="group relative">
                <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)]"><Menu className="h-5 w-5" /></summary>
                <nav className="absolute left-0 top-12 w-72 space-y-1 rounded-2xl border border-[var(--border)] bg-[var(--sidebar-navy)] p-3 shadow-2xl">{links.map((item) => <PilyeNavLink key={item.href} item={item} pathname={pathname ?? ""} />)}</nav>
              </details>
              <Link href="/my-mentorship" className="font-serif text-2xl font-bold text-[#173c36]">Pilye</Link>
            </div>
            <div className="hidden lg:block"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a6556]">{isStaff ? "Program workspace" : "Your learning space"}</p><p className="mt-1 text-sm font-semibold">{organization?.displayName ?? organization?.name ?? "NextGen Haitian Empowerment"}</p></div>
            {user ? <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.firstName} {user.lastName}</p><p className="text-[11px] text-[var(--text-secondary)]">{isStaff ? "Pilye program team" : roleLabel(user.role)}</p></div><Avatar user={user} size="sm" /><button type="button" onClick={logout} aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] transition hover:border-[#2f7464] hover:text-[#2f7464]"><LogOut className="h-4 w-4" /></button></div> : null}
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-7 lg:px-8 xl:px-10">
          {organizationsQuery.isLoading ? <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-sm text-[var(--text-secondary)]">Preparing your Pilye classroom…</div> : inPilye && hasPilye ? children : <AccessDenied />}
        </main>
      </div>
    </div>
  );
}

function PilyeMark() {
  return <span className="relative block h-10 w-10 shrink-0" aria-hidden="true"><i className="absolute bottom-1 left-1 h-[18px] w-2 rounded-t-full bg-[#f4c85a]" /><i className="absolute bottom-1 left-4 h-[30px] w-2 rounded-t-full bg-[#f4c85a]" /><i className="absolute bottom-1 left-7 h-6 w-2 rounded-t-full bg-[#f4c85a]" /></span>;
}

function PilyeNavLink({ item, pathname }: { item: PilyeLink; pathname: string }) {
  const Icon = item.icon;
  const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return <Link href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#c9d8d3] transition hover:bg-white/10 hover:text-white", active && "bg-[#f7f0dc] text-[#173c36] hover:bg-[#f7f0dc] hover:text-[#173c36]")}><Icon className="h-[18px] w-[18px]" /> {item.label}</Link>;
}
