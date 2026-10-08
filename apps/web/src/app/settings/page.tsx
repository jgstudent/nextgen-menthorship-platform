"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import Link from "next/link";
import { Building2, LockKeyhole, UserCircle, UsersRound } from "lucide-react";

const accountSettings = [
  { title: "Security", href: "/settings/security", icon: LockKeyhole, description: "Change your password and manage your Pilye account security." },
  { title: "User Profile", href: "/settings/profile", icon: UserCircle, description: "Update your name and profile image shown throughout Pilye." }
];

const programSettings = [
  { title: "User Access", href: "/users", icon: UsersRound, description: "Manage Pilye accounts, roles, and access." },
  { title: "Organization Profile", href: "/settings/organization", icon: Building2, description: "Maintain basic organization details and branding settings." },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const settings = user?.role === "SUPER_ADMIN" ? [...programSettings, ...accountSettings] : user?.role === "EXECUTIVE" ? [programSettings[1], ...accountSettings] : accountSettings;
  return (
    <>
      <PageHeader title="Pilye settings" description="Manage your independent Pilye account, access, organization profile, and appearance." />
      <Card className="mb-5 border-t-4 border-t-[#1D4ED8] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Appearance</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Choose a comfortable theme for day-to-day operations and executive review.</p>
          </div>
          <div className="min-w-full lg:min-w-[360px]">
            <ThemeToggle />
          </div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {settings.map((item) => (
          <Link key={item.title} href={item.href} className="block">
            <Card className="h-full border-t-4 border-t-[#10B981] p-5 transition hover:-translate-y-0.5 hover:border-[#1D4ED8] hover:shadow-soft">
              <item.icon className="mb-4 h-5 w-5 text-[#1D4ED8]" />
              <h3 className="font-semibold text-[var(--text-primary)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
