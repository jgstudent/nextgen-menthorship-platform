"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Beneficiary } from "@/types/domain";

export default function BeneficiariesPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["beneficiaries"], queryFn: () => api<Beneficiary[]>("/beneficiaries") });
  const beneficiaries = useMemo(() => (data ?? []).filter((person) => `${person.firstName} ${person.lastName} ${person.city ?? ""} ${person.country}`.toLowerCase().includes(search.toLowerCase())), [data, search]);

  return (
    <>
      <PageHeader title="Beneficiaries" description="Track participant onboarding, program enrollment, mentors, and mission delivery progress." />
      <div className="mb-5 grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Visible Beneficiaries" value={data?.length ?? 0} />
          <Metric label="Active" value={(data ?? []).filter((person) => person.programStatus === "ACTIVE").length} />
          <Metric label="Enrollments" value={(data ?? []).reduce((total, person) => total + (person.enrollments?.length ?? 0), 0)} />
        </div>
        <label className="relative block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search beneficiaries" className="pl-9" />
        </label>
      </div>
      {isLoading ? <EmptyState text="Loading beneficiaries..." /> : beneficiaries.length ? (
        <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-soft">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] bg-[#0B1220] px-4 py-3 text-xs font-semibold uppercase text-white">
            <span>Name</span><span>Status</span><span>Mentor</span><span>Progress</span>
          </div>
          {beneficiaries.map((person) => {
            const progress = Math.round((person.enrollments ?? []).reduce((total, enrollment) => total + enrollment.progressPercent, 0) / Math.max(person.enrollments?.length ?? 1, 1));
            return (
              <div key={person.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center border-t border-[#E2E8F0] px-4 py-3 text-sm">
                <div><p className="font-semibold text-[#0B1220]">{person.firstName} {person.lastName}</p><p className="text-[#64748B]">{person.city ? `${person.city}, ` : ""}{person.country}</p></div>
                <Badge tone={person.programStatus === "ACTIVE" ? "green" : "gray"}>{person.programStatus}</Badge>
                <span className="text-[#64748B]">{person.assignedMentor ? `${person.assignedMentor.firstName} ${person.assignedMentor.lastName}` : "Unassigned"}</span>
                <div className="min-w-0"><div className="h-2 rounded-full bg-[#E2E8F0]"><div className="h-2 rounded-full bg-[#10B981]" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-xs text-[#64748B]">{progress}% average</p></div>
              </div>
            );
          })}
        </div>
      ) : <EmptyState text="No beneficiaries are visible for your role and assignments." />}
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><p className="mt-2 text-2xl font-bold text-[#0B1220]">{value}</p></Card>;
}

function EmptyState({ text }: { text: string }) {
  return <Card className="border-dashed p-8 text-center text-sm text-[#64748B]">{text}</Card>;
}
