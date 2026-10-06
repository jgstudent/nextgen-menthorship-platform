"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Plus, Search } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { canArchivePrograms, canManagePrograms } from "@/lib/permissions";
import type { Program, ProgramStatus, ProgramVisibility, Workspace } from "@/types/domain";

const programStatuses: ProgramStatus[] = ["PLANNING", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"];
const programVisibilities: ProgramVisibility[] = ["INTERNAL", "SPONSOR_VISIBLE", "PUBLIC_SUMMARY"];

export default function ProgramsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Program | null>(null);
  const [form, setForm] = useState({ name: "", category: "", description: "", status: "PLANNING" as ProgramStatus, visibility: "INTERNAL" as ProgramVisibility, workspaceId: "" });
  const { data, isLoading } = useQuery({ queryKey: ["programs"], queryFn: () => api<Program[]>("/programs") });
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: () => api<Workspace[]>("/workspaces"), enabled: canManagePrograms(user?.role) });
  const programs = useMemo(() => (data ?? []).filter((program) => `${program.name} ${program.category}`.toLowerCase().includes(search.toLowerCase())), [data, search]);
  const mayCreate = canManagePrograms(user?.role);
  const mayArchive = canArchivePrograms(user?.role);
  const workspaceOptions = workspaces ?? [];

  const createProgram = useMutation({
    mutationFn: () => api<Program>("/programs", { method: "POST", body: JSON.stringify({ ...form, workspaceId: form.workspaceId || workspaceOptions[0]?.id }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setCreating(false);
      setForm({ name: "", category: "", description: "", status: "PLANNING", visibility: "INTERNAL", workspaceId: "" });
      toast({ title: "Program created", description: "The new program is ready for pilot operations.", tone: "success" });
    },
    onError: (error) => toast({ title: "Unable to create program", description: error instanceof Error ? error.message : "Please check the program details.", tone: "error" })
  });

  const archiveProgram = useMutation({
    mutationFn: (programId: string) => api<Program>(`/programs/${programId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setArchiveTarget(null);
      toast({ title: "Program archived", description: "The program is hidden from active views.", tone: "success" });
    },
    onError: (error) => toast({ title: "Unable to archive program", description: error instanceof Error ? error.message : "Please try again.", tone: "error" })
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    createProgram.mutate();
  }

  return (
    <>
      <PageHeader title="Programs" description="Manage mission delivery initiatives separate from day-to-day projects." actions={mayCreate ? <Button type="button" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create Program</Button> : null} />
      <div className="mb-5 grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Active Programs" value={(data ?? []).filter((program) => program.status === "ACTIVE").length} />
          <Metric label="Sponsor Visible" value={(data ?? []).filter((program) => program.visibility !== "INTERNAL").length} />
          <Metric label="Enrollments" value={(data ?? []).reduce((total, program) => total + (program.enrollments?.length ?? 0), 0)} />
        </div>
        <label className="relative block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search programs" className="pl-9" />
        </label>
      </div>
      {isLoading ? <EmptyState text="Loading programs..." /> : programs.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {programs.map((program) => (
            <Card key={program.id} className="border-t-4 border-t-[#1D4ED8] p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#0B1220]">{program.name}</h3>
                  <p className="mt-1 text-sm text-[#64748B]">{program.category} - {program.workspace?.name}</p>
                </div>
                <div className="flex gap-2">
                  <Badge tone={program.status === "ACTIVE" ? "green" : "gray"}>{program.status}</Badge>
                  <Badge tone={program.visibility === "SPONSOR_VISIBLE" ? "gold" : program.visibility === "PUBLIC_SUMMARY" ? "blue" : "gray"}>{program.visibility}</Badge>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#64748B]">{program.description ?? "No description added yet."}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Projects" value={program.projects?.length ?? 0} />
                <MiniMetric label="Workshops" value={program.workshops?.length ?? 0} />
                <MiniMetric label="Beneficiaries" value={program.enrollments?.length ?? 0} />
              </div>
              {mayArchive ? (
                <div className="mt-4 flex justify-end">
                  <Button type="button" className="border border-[#CBD5E1] bg-white text-[#64748B] shadow-none hover:bg-[#F8FAFC]" onClick={() => setArchiveTarget(program)}>
                    <Archive className="h-4 w-4" /> Archive
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : <EmptyState text="No programs are visible for your role and assignments yet." />}
      <Dialog open={creating} title="Create Program" description="Add a mission delivery initiative for the live pilot." onClose={() => setCreating(false)}>
        <form className="space-y-4" onSubmit={submit}>
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Program name" required />
          <Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Category" required />
          <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" />
          <Select value={form.workspaceId || workspaceOptions[0]?.id || ""} onChange={(event) => setForm({ ...form, workspaceId: event.target.value })} required>
            {workspaceOptions.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProgramStatus })}>{programStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</Select>
            <Select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as ProgramVisibility })}>{programVisibilities.map((visibility) => <option key={visibility} value={visibility}>{visibility}</option>)}</Select>
          </div>
          <Button type="submit" disabled={createProgram.isPending || !workspaceOptions.length}>{createProgram.isPending ? "Creating..." : "Create Program"}</Button>
        </form>
      </Dialog>
      <Dialog open={Boolean(archiveTarget)} title="Are you sure?" description="This will archive the program and hide it from normal program views." onClose={() => setArchiveTarget(null)}>
        <div className="space-y-4">
          <p className="text-sm text-[#64748B]">{archiveTarget?.name}</p>
          <div className="flex justify-end gap-3">
            <Button type="button" className="border border-[#CBD5E1] bg-white text-[#64748B] shadow-none hover:bg-[#F8FAFC]" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button type="button" disabled={archiveProgram.isPending} onClick={() => archiveTarget && archiveProgram.mutate(archiveTarget.id)}>{archiveProgram.isPending ? "Archiving..." : "Archive Program"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><p className="mt-2 text-2xl font-bold text-[#0B1220]">{value}</p></Card>;
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3"><p className="text-xs text-[#64748B]">{label}</p><p className="font-semibold text-[#0B1220]">{value}</p></div>;
}

function EmptyState({ text }: { text: string }) {
  return <Card className="border-dashed p-8 text-center text-sm text-[#64748B]">{text}</Card>;
}
