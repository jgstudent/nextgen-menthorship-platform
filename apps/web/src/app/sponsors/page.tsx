"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Program, Workshop } from "@/types/domain";

export default function SponsorsPage() {
  const { data: programs, isLoading } = useQuery({ queryKey: ["sponsor-programs"], queryFn: () => api<Program[]>("/programs") });
  const { data: workshops } = useQuery({ queryKey: ["sponsor-workshops"], queryFn: () => api<Workshop[]>("/workshops") });
  const visiblePrograms = programs ?? [];

  return (
    <>
      <PageHeader title="Sponsor Transparency" description="Approved program progress, milestones, and impact summaries without internal or personal data." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Metric label="Approved Programs" value={visiblePrograms.length} />
        <Metric label="Visible Workshops" value={workshops?.length ?? 0} />
        <Metric label="Public Summaries" value={visiblePrograms.filter((program) => program.visibility === "PUBLIC_SUMMARY").length} />
      </div>
      {isLoading ? <EmptyState text="Loading sponsor-visible programs..." /> : visiblePrograms.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visiblePrograms.map((program) => (
            <Card key={program.id} className="border-t-4 border-t-[#D4A017] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-[#0B1220]">{program.name}</h3>
                  <p className="mt-1 text-sm text-[#64748B]">{program.category}</p>
                </div>
                <Badge tone={program.status === "ACTIVE" ? "green" : "gray"}>{program.status}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#64748B]">{program.description ?? "Approved summary pending."}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Impact label="Milestones" value={program.projects?.length ?? 0} />
                <Impact label="Training Events" value={program.workshops?.length ?? 0} />
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState text="No sponsor-approved programs are available yet." />}
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><p className="mt-2 text-2xl font-bold text-[#0B1220]">{value}</p></Card>;
}

function Impact({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3"><p className="text-xs text-[#64748B]">{label}</p><p className="font-semibold text-[#0B1220]">{value}</p></div>;
}

function EmptyState({ text }: { text: string }) {
  return <Card className="border-dashed p-8 text-center text-sm text-[#64748B]">{text}</Card>;
}
