"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, UserRoundCheck, UsersRound } from "lucide-react";
import { AccessDenied } from "@/components/auth/access-denied";
import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { canPreviewMentorship } from "@/lib/permissions";
import type { MentorshipParticipantRole, MentorshipParticipantStatus, MentorshipProgram, MentorshipRosterParticipant } from "@/types/mentorship";

const statuses: MentorshipParticipantStatus[] = ["MATCHING_POOL", "WAITLISTED", "UNAVAILABLE", "ACTIVE", "COMPLETED", "WITHDRAWN"];
const roles: MentorshipParticipantRole[] = ["MENTOR", "TUTOR", "MENTEE"];

export default function MentorshipParticipantsPage() {
  const { user } = useAuth();
  const allowed = canPreviewMentorship(user?.role);
  const client = useQueryClient();
  const [programId, setProgramId] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string>();
  const programsQuery = useQuery({ queryKey: ["mentorship", "programs"], queryFn: () => api<MentorshipProgram[]>("/mentorship/programs"), enabled: Boolean(user) && allowed });
  const programs = programsQuery.data ?? [];
  const selectedProgram = programs.find((item) => item.id === programId) ?? programs[0];
  const selectedProgramId = selectedProgram?.id ?? "";
  const participantsQuery = useQuery({ queryKey: ["mentorship", "participants", selectedProgramId], queryFn: () => api<MentorshipRosterParticipant[]>(`/mentorship/programs/${selectedProgramId}/participants`), enabled: Boolean(user) && allowed && Boolean(selectedProgramId) });
  const participants = participantsQuery.data ?? [];
  const filtered = participants.filter((participant) => (!cohortId || participant.cohortId === cohortId) && (!role || participant.role === role) && (!status || participant.status === status));
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status?: MentorshipParticipantStatus; availableForMatch?: boolean } }) => api(`/mentorship/programs/${selectedProgramId}/participants/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: async () => { setError(undefined); await client.invalidateQueries({ queryKey: ["mentorship", "participants", selectedProgramId] }); },
    onError: (caught) => setError(messageFrom(caught))
  });

  if (!user) return null;
  if (!allowed) return <AccessDenied />;

  return <>
    <nav className="mb-4 text-sm text-[var(--text-secondary)]"><Link href="/programs/mentorship" className="hover:underline">Mentorship</Link><span> / Participants</span></nav>
    <PageHeader title="Mentorship participants" description="Manage approved mentors, tutors, and mentees before and during matching." actions={<Link href="/programs/mentorship/matching" className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--primary-blue)] px-4 text-sm font-semibold text-white"><Sparkles className="h-4 w-4" /> Open matching</Link>} />
    {error ? <Card className="mb-5 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card> : null}
    <div className="mb-5 grid gap-3 sm:grid-cols-4"><Metric label="Participants" value={participants.length} /><Metric label="Matching pool" value={participants.filter((item) => item.status === "MATCHING_POOL" && item.availableForMatch).length} /><Metric label="Waitlisted" value={participants.filter((item) => item.status === "WAITLISTED").length} /><Metric label="Active" value={participants.filter((item) => item.status === "ACTIVE").length} /></div>
    <Card className="mb-5 p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Select aria-label="Program" value={selectedProgramId} onChange={(event) => { setProgramId(event.target.value); setCohortId(""); }}><option value="" disabled>Select program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</Select><Select aria-label="Cohort filter" value={cohortId} onChange={(event) => setCohortId(event.target.value)}><option value="">All cohorts</option>{selectedProgram?.cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</Select><Select aria-label="Role filter" value={role} onChange={(event) => setRole(event.target.value)}><option value="">All participant types</option>{roles.map((item) => <option key={item} value={item}>{label(item)}</option>)}</Select><Select aria-label="Status filter" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</Select></div></Card>
    {programsQuery.isLoading || participantsQuery.isLoading ? <Card className="p-8 text-center">Loading participants…</Card> : filtered.length ? <div className="space-y-4">{filtered.map((participant) => <ParticipantCard key={participant.id} participant={participant} pending={update.isPending} onStatus={(next) => update.mutate({ id: participant.id, body: { status: next, availableForMatch: next === "MATCHING_POOL" ? participant.availableForMatch : false } })} onAvailability={(availableForMatch) => update.mutate({ id: participant.id, body: { availableForMatch } })} />)}</div> : <Card className="border-dashed p-10 text-center"><UsersRound className="mx-auto h-9 w-9 text-[var(--primary-blue)]" /><h2 className="mt-3 font-semibold">No participants match these filters</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Approved applications will appear here automatically.</p></Card>}
  </>;
}

function ParticipantCard({ participant, pending, onStatus, onAvailability }: { participant: MentorshipRosterParticipant; pending: boolean; onStatus: (status: MentorshipParticipantStatus) => void; onAvailability: (available: boolean) => void }) {
  const application = participant.application;
  const matchingEligible = participant.status === "MATCHING_POOL";
  return <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><UserRoundCheck className="h-4 w-4 text-[var(--primary-blue)]" /><h2 className="font-semibold">{application.firstName} {application.lastName}</h2><Badge tone={participant.role === "MENTOR" ? "blue" : participant.role === "TUTOR" ? "green" : "gold"}>{label(participant.role)}</Badge><Badge tone={participant.status === "ACTIVE" || participant.status === "MATCHING_POOL" ? "green" : participant.status === "WAITLISTED" ? "gold" : "gray"}>{label(participant.status)}</Badge></div><p className="mt-1 text-sm text-[var(--text-secondary)]">{application.email} · {participant.cohort.name}</p></div><div className="flex flex-wrap gap-2"><Select aria-label={`${application.firstName} ${application.lastName} status`} value={participant.status} disabled={pending} onChange={(event) => onStatus(event.target.value as MentorshipParticipantStatus)}>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</Select><label className={`flex items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm ${matchingEligible ? "" : "opacity-60"}`}><input type="checkbox" checked={participant.availableForMatch} disabled={pending || !matchingEligible} onChange={(event) => onAvailability(event.target.checked)} /> Available for matching</label></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Academic level" value={application.academicLevel ?? "Not provided"} /><Detail label="Languages" value={application.languages.join(", ") || "Not provided"} /><Detail label={participant.role === "MENTEE" ? "Support needs" : "Capabilities"} value={(participant.role === "MENTEE" ? application.supportNeeds : application.mentoringCapabilities).join(", ") || "Not provided"} /><Detail label="Meeting mode" value={application.meetingMode ? label(application.meetingMode) : "Not provided"} /></div></Card>;
}

function Metric({ label: text, value }: { label: string; value: number }) { return <Card className="p-4"><p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">{text}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>; }
function Detail({ label: text, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[var(--text-secondary)]">{text}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }
function messageFrom(value: unknown) { if (!(value instanceof Error)) return "The request could not be completed."; try { const parsed = JSON.parse(value.message) as { message?: string | string[] }; return Array.isArray(parsed.message) ? parsed.message.join(" ") : parsed.message ?? value.message; } catch { return value.message; } }
