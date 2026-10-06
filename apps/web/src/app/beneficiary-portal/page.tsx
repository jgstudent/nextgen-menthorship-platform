"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Beneficiary, Meeting, Task } from "@/types/domain";

export default function BeneficiaryPortalPage() {
  const { data: beneficiaries, isLoading } = useQuery({ queryKey: ["beneficiary-portal"], queryFn: () => api<Beneficiary[]>("/beneficiaries") });
  const { data: tasks } = useQuery({ queryKey: ["beneficiary-tasks"], queryFn: () => api<Task[]>("/tasks") });
  const { data: meetings } = useQuery({ queryKey: ["beneficiary-meetings"], queryFn: () => api<Meeting[]>("/meetings") });
  const profile = beneficiaries?.[0];

  return (
    <>
      <PageHeader title="My Beneficiary Portal" description="Your assigned programs, workshops, meetings, tasks, resources, and mentor support." />
      {isLoading ? <EmptyState text="Loading your portal..." /> : profile ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#64748B]">Participant</p>
                <h2 className="text-xl font-bold text-[#0B1220]">{profile.firstName} {profile.lastName}</h2>
                <p className="mt-1 text-sm text-[#64748B]">Mentor: {profile.assignedMentor ? `${profile.assignedMentor.firstName} ${profile.assignedMentor.lastName}` : "Not assigned yet"}</p>
              </div>
              <Badge tone={profile.programStatus === "ACTIVE" ? "green" : "gray"}>{profile.programStatus}</Badge>
            </div>
            <div className="mt-5 space-y-4">
              {(profile.enrollments ?? []).map((enrollment) => (
                <div key={enrollment.id} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#0B1220]">{enrollment.program?.name}</p>
                    <Badge tone="blue">{enrollment.status}</Badge>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[#E2E8F0]"><div className="h-2 rounded-full bg-[#10B981]" style={{ width: `${enrollment.progressPercent}%` }} /></div>
                  <p className="mt-2 text-xs text-[#64748B]">{enrollment.progressPercent}% complete</p>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-6">
            <Panel title="Upcoming Workshops" empty="No assigned workshops yet.">{(profile.workshopEnrollments ?? []).map((enrollment) => <Line key={enrollment.id} title={enrollment.workshop?.title ?? "Workshop"} detail={enrollment.workshop ? new Date(enrollment.workshop.startTime).toLocaleString() : enrollment.status} />)}</Panel>
            <Panel title="Assigned Tasks" empty="No assigned tasks yet.">{(tasks ?? []).map((task) => <Line key={task.id} title={task.title} detail={task.status} />)}</Panel>
            <Panel title="Meetings" empty="No meetings are visible yet.">{(meetings ?? []).slice(0, 4).map((meeting) => <Line key={meeting.id} title={meeting.title} detail={new Date(meeting.startTime).toLocaleString()} />)}</Panel>
          </div>
        </div>
      ) : <EmptyState text="No beneficiary profile is linked to this account yet." />}
    </>
  );
}

function Panel({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  return <Card className="p-5"><h3 className="font-semibold text-[#0B1220]">{title}</h3><div className="mt-4 space-y-3">{Array.isArray(children) && children.length === 0 ? <p className="text-sm text-[#64748B]">{empty}</p> : children}</div></Card>;
}

function Line({ title, detail }: { title: string; detail?: string }) {
  return <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3"><p className="font-medium text-[#0B1220]">{title}</p><p className="text-sm text-[#64748B]">{detail}</p></div>;
}

function EmptyState({ text }: { text: string }) {
  return <Card className="border-dashed p-8 text-center text-sm text-[#64748B]">{text}</Card>;
}
