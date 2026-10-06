"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Organization } from "@/types/domain";

export default function AppIntegrationsPage() {
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: () => api<Organization[]>("/organizations") });
  const organization = organizations.data?.[0];
  const enabled = organization?.enabledAddOns?.includes("MENTORSHIP") ?? false;
  return <>
    <PageHeader title="App Integrations" description="Optional tools and program add-ons available inside the collaboration hub." />
    <div className="grid max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card className="p-5"><div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[var(--primary-blue)]"><GraduationCap className="h-6 w-6" /></span><Badge tone={enabled ? "green" : "gray"}>{enabled ? "Enabled" : "Available"}</Badge></div><h2 className="mt-4 text-lg font-semibold">Mentorship & Tutoring</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Manage cohorts, public applications, mentors, tutors, mentees, and administrator-approved matching.</p><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--primary-blue)]">Programs add-on</p><Link href={enabled ? "/programs/mentorship" : "/settings/organization"} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-blue)] hover:underline">{enabled ? "Open add-on" : "View activation settings"}<ArrowRight className="h-4 w-4" /></Link></Card>
    </div>
  </>;
}
