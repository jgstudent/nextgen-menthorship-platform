"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CalendarDays, MapPin, Plus } from "lucide-react";
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
import { canArchiveWorkshops, canManageWorkshops } from "@/lib/permissions";
import type { Program, User, Workshop, WorkshopVisibility } from "@/types/domain";

const visibilities: WorkshopVisibility[] = ["INTERNAL", "SPONSOR_VISIBLE", "BENEFICIARY_VISIBLE", "PUBLIC_SUMMARY"];

export default function WorkshopsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Workshop | null>(null);
  const [form, setForm] = useState({ title: "", description: "", programId: "", startTime: "", endTime: "", location: "", virtualMeetingUrl: "", visibility: "INTERNAL" as WorkshopVisibility, instructorId: "" });
  const { data, isLoading } = useQuery({ queryKey: ["workshops"], queryFn: () => api<Workshop[]>("/workshops") });
  const { data: programs } = useQuery({ queryKey: ["programs"], queryFn: () => api<Program[]>("/programs"), enabled: canManageWorkshops(user?.role) });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/users"), enabled: user?.role === "SUPER_ADMIN" || user?.role === "EXECUTIVE" });
  const workshops = data ?? [];
  const programOptions = programs ?? [];
  const userOptions = users ?? (user ? [user] : []);
  const mayCreate = canManageWorkshops(user?.role);
  const mayArchive = canArchiveWorkshops(user?.role);
  const createWorkshop = useMutation({
    mutationFn: () => api<Workshop>("/workshops", { method: "POST", body: JSON.stringify({ ...form, programId: form.programId || programOptions[0]?.id, instructorId: form.instructorId || undefined, location: form.location || undefined, virtualMeetingUrl: form.virtualMeetingUrl || undefined, startTime: new Date(form.startTime).toISOString(), endTime: new Date(form.endTime).toISOString() }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshops"] });
      setCreating(false);
      setForm({ title: "", description: "", programId: "", startTime: "", endTime: "", location: "", virtualMeetingUrl: "", visibility: "INTERNAL", instructorId: "" });
      toast({ title: "Workshop created", description: "The workshop is now available in the schedule.", tone: "success" });
    },
    onError: (error) => toast({ title: "Unable to create workshop", description: error instanceof Error ? error.message : "Please check the workshop details.", tone: "error" })
  });

  const archiveWorkshop = useMutation({
    mutationFn: (workshopId: string) => api<Workshop>(`/workshops/${workshopId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshops"] });
      setArchiveTarget(null);
      toast({ title: "Workshop archived", description: "The workshop is hidden from active views.", tone: "success" });
    },
    onError: (error) => toast({ title: "Unable to archive workshop", description: error instanceof Error ? error.message : "Please try again.", tone: "error" })
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    createWorkshop.mutate();
  }

  return (
    <>
      <PageHeader title="Workshops" description="Coordinate training sessions, instructors, attendance foundations, and program resources." actions={mayCreate ? <Button type="button" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create Workshop</Button> : null} />
      {isLoading ? <EmptyState text="Loading workshops..." /> : workshops.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {workshops.map((workshop) => (
            <Card key={workshop.id} className="border-t-4 border-t-[#10B981] p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#0B1220]">{workshop.title}</h3>
                  <p className="mt-1 text-sm text-[#64748B]">{workshop.program?.name}</p>
                </div>
                <Badge tone={workshop.visibility === "SPONSOR_VISIBLE" ? "gold" : workshop.visibility === "BENEFICIARY_VISIBLE" ? "green" : "gray"}>{workshop.visibility}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#64748B]">{workshop.description ?? "No description added yet."}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info icon={<CalendarDays className="h-4 w-4" />} text={`${new Date(workshop.startTime).toLocaleString()} - ${new Date(workshop.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`} />
                <Info icon={<MapPin className="h-4 w-4" />} text={workshop.location ?? workshop.virtualMeetingUrl ?? "Location pending"} />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-md bg-[#F8FAFC] p-3 text-sm">
                <span className="text-[#64748B]">Instructor</span>
                <span className="font-semibold text-[#0B1220]">{workshop.instructor ? `${workshop.instructor.firstName} ${workshop.instructor.lastName}` : "Unassigned"}</span>
              </div>
              {mayArchive ? (
                <div className="mt-4 flex justify-end">
                  <Button type="button" className="border border-[#CBD5E1] bg-white text-[#64748B] shadow-none hover:bg-[#F8FAFC]" onClick={() => setArchiveTarget(workshop)}>
                    <Archive className="h-4 w-4" /> Archive
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : <EmptyState text="No workshops are visible for your access yet." />}
      <Dialog open={creating} title="Create Workshop" description="Schedule a program training session or workshop." onClose={() => setCreating(false)}>
        <form className="space-y-4" onSubmit={submit}>
          <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Workshop title" required />
          <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" />
          <Select value={form.programId || programOptions[0]?.id || ""} onChange={(event) => setForm({ ...form, programId: event.target.value })} required>{programOptions.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="datetime-local" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required />
            <Input type="datetime-local" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Location" />
            <Input value={form.virtualMeetingUrl} onChange={(event) => setForm({ ...form, virtualMeetingUrl: event.target.value })} placeholder="Meeting link" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as WorkshopVisibility })}>{visibilities.map((visibility) => <option key={visibility} value={visibility}>{visibility}</option>)}</Select>
            <Select value={form.instructorId} onChange={(event) => setForm({ ...form, instructorId: event.target.value })}><option value="">No instructor</option>{userOptions.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</Select>
          </div>
          <Button type="submit" disabled={createWorkshop.isPending || !programOptions.length}>{createWorkshop.isPending ? "Creating..." : "Create Workshop"}</Button>
        </form>
      </Dialog>
      <Dialog open={Boolean(archiveTarget)} title="Are you sure?" description="This will archive the workshop and hide it from normal workshop views." onClose={() => setArchiveTarget(null)}>
        <div className="space-y-4">
          <p className="text-sm text-[#64748B]">{archiveTarget?.title}</p>
          <div className="flex justify-end gap-3">
            <Button type="button" className="border border-[#CBD5E1] bg-white text-[#64748B] shadow-none hover:bg-[#F8FAFC]" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button type="button" disabled={archiveWorkshop.isPending} onClick={() => archiveTarget && archiveWorkshop.mutate(archiveTarget.id)}>{archiveWorkshop.isPending ? "Archiving..." : "Archive Workshop"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function Info({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="flex items-center gap-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm text-[#64748B]">{icon}<span>{text}</span></div>;
}

function EmptyState({ text }: { text: string }) {
  return <Card className="border-dashed p-8 text-center text-sm text-[#64748B]">{text}</Card>;
}
