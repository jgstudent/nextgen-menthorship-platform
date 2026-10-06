"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { AccessDenied } from "@/components/auth/access-denied";
import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { canPreviewMentorship } from "@/lib/permissions";
import type { MentorshipProgram, MentorshipServiceHour, MentorshipServiceHourReport, MentorshipServiceHourStatus, MentorshipStipendStatus } from "@/types/mentorship";

export default function MentorshipServiceHoursPage() {
  const { user } = useAuth();
  const allowed = canPreviewMentorship(user?.role);
  const client = useQueryClient();
  const [programId, setProgramId] = useState("");
  const [reviewEntry, setReviewEntry] = useState<MentorshipServiceHour>();
  const [review, setReview] = useState({ decision: "APPROVED" as MentorshipServiceHourStatus, reviewNotes: "" });
  const [stipendParticipantId, setStipendParticipantId] = useState<string>();
  const [stipend, setStipend] = useState({ status: "PENDING_REVIEW" as MentorshipStipendStatus, notes: "" });
  const [error, setError] = useState<string>();
  const programsQuery = useQuery({ queryKey: ["mentorship", "programs"], queryFn: () => api<MentorshipProgram[]>("/mentorship/programs"), enabled: Boolean(user) && allowed });
  const programs = programsQuery.data ?? [];
  const selectedProgram = programs.find((item) => item.id === programId) ?? programs[0];
  const selectedProgramId = selectedProgram?.id ?? "";
  const reportQuery = useQuery({ queryKey: ["mentorship", "service-hours", selectedProgramId], queryFn: () => api<MentorshipServiceHourReport>(`/mentorship/programs/${selectedProgramId}/service-hours`), enabled: Boolean(user) && allowed && Boolean(selectedProgramId) });
  const refresh = () => client.invalidateQueries({ queryKey: ["mentorship", "service-hours", selectedProgramId] });
  const options = { onSuccess: async () => { setError(undefined); await refresh(); }, onError: (caught: unknown) => setError(messageFrom(caught)) };
  const reviewHours = useMutation({ mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api(`/mentorship/programs/${selectedProgramId}/service-hours/${id}/review`, { method: "POST", body: JSON.stringify(body) }), ...options });
  const decideStipend = useMutation({ mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api(`/mentorship/programs/${selectedProgramId}/participants/${id}/stipend-decision`, { method: "POST", body: JSON.stringify(body) }), ...options });
  const report = reportQuery.data;
  const selectedEligibility = report?.eligibility.find((item) => item.participantId === stipendParticipantId);

  if (!user) return null;
  if (!allowed) return <AccessDenied />;

  function submitReview(event: FormEvent) {
    event.preventDefault();
    if (!reviewEntry) return;
    reviewHours.mutate({ id: reviewEntry.id, body: review }, { onSuccess: () => { setReviewEntry(undefined); setReview({ decision: "APPROVED", reviewNotes: "" }); } });
  }

  function submitStipend(event: FormEvent) {
    event.preventDefault();
    if (!stipendParticipantId) return;
    decideStipend.mutate({ id: stipendParticipantId, body: stipend }, { onSuccess: () => { setStipendParticipantId(undefined); setStipend({ status: "PENDING_REVIEW", notes: "" }); } });
  }

  return <>
    <nav className="mb-4 text-sm text-[var(--text-secondary)]"><Link href="/programs/mentorship" className="hover:underline">Mentorship</Link><span> / Verified service hours</span></nav>
    <PageHeader title="Verified service hours" description="Review submitted hours before they count toward program completion or stipend eligibility." />
    {error ? <Card className="mb-5 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card> : null}
    <Card className="mb-5 p-4"><Select aria-label="Program" value={selectedProgramId} onChange={(event) => setProgramId(event.target.value)}><option value="" disabled>Select program</option>{programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Card>
    {reportQuery.isLoading ? <Card className="p-8 text-center">Loading service-hour records…</Card> : !report ? <Card className="p-8 text-center">Select a program to review service hours.</Card> : <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Clock3} label="Awaiting review" value={report.summary.submitted} /><Metric icon={ShieldCheck} label="Verified hours" value={report.summary.verifiedHours} /><Metric icon={CheckCircle2} label="Approved entries" value={report.summary.approved} /><Metric icon={BadgeDollarSign} label="Stipend eligible" value={report.summary.stipendEligible} /></div>

      <section><div className="mb-3"><h2 className="text-lg font-semibold">Hour submissions</h2><p className="text-sm text-[var(--text-secondary)]">Only approved entries are included in verified totals.</p></div>{report.entries.length ? <Card className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="border-b border-[var(--border)] bg-slate-50 text-xs uppercase text-[var(--text-secondary)]"><tr><th className="p-4">Participant</th><th className="p-4">Service</th><th className="p-4">Time</th><th className="p-4">Evidence</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>{report.entries.map((entry) => <tr key={entry.id} className="border-b border-[var(--border)] last:border-0"><td className="p-4"><p className="font-semibold">{entry.participant?.application.firstName} {entry.participant?.application.lastName}</p><p className="text-xs text-[var(--text-secondary)]">{entry.cohort?.name} · {label(entry.participant?.role ?? "")}</p></td><td className="p-4"><p className="font-medium">{entry.activity}</p><p className="text-xs text-[var(--text-secondary)]">{formatDate(entry.serviceDate)}{entry.session ? ` · ${entry.session.title}` : ""}</p>{entry.description ? <p className="mt-1 max-w-md text-xs text-[var(--text-secondary)]">{entry.description}</p> : null}</td><td className="p-4 font-semibold">{formatHours(entry.minutes)}</td><td className="p-4">{entry.evidenceUrl ? <a className="text-[var(--primary-blue)] hover:underline" href={entry.evidenceUrl} target="_blank" rel="noreferrer">Open evidence</a> : <span className="text-[var(--text-secondary)]">None</span>}</td><td className="p-4"><Badge tone={entry.status === "APPROVED" ? "green" : entry.status === "REJECTED" ? "gray" : "gold"}>{label(entry.status)}</Badge>{entry.reviewNotes ? <p className="mt-1 max-w-xs text-xs text-[var(--text-secondary)]">{entry.reviewNotes}</p> : null}</td><td className="p-4">{entry.status === "SUBMITTED" || entry.status === "UNDER_REVIEW" ? <Button type="button" onClick={() => { setReviewEntry(entry); setReview({ decision: "APPROVED", reviewNotes: "" }); }}>Review</Button> : <span className="text-xs text-[var(--text-secondary)]">Reviewed</span>}</td></tr>)}</tbody></table></Card> : <Card className="border-dashed p-8 text-center text-sm text-[var(--text-secondary)]">No service hours have been submitted.</Card>}</section>

      <section><div className="mb-3"><h2 className="text-lg font-semibold">Stipend eligibility</h2><p className="text-sm text-[var(--text-secondary)]">Eligibility remains an explicit administrative decision after approved hours and other cohort requirements are reviewed.</p></div><div className="grid gap-4 xl:grid-cols-2">{report.eligibility.filter((item) => item.stipendEnabled).map((item) => <Card key={item.participantId} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.participant.firstName} {item.participant.lastName}</p><p className="text-sm text-[var(--text-secondary)]">{label(item.role)} · {item.cohort.name}</p></div><Badge tone={item.decision?.status === "PAID" || item.decision?.status === "APPROVED" || item.decision?.status === "ELIGIBLE" ? "green" : item.decision?.status === "INELIGIBLE" ? "gray" : "gold"}>{label(item.decision?.status ?? "PENDING_REVIEW")}</Badge></div><div className="mt-4"><div className="flex justify-between text-sm"><span>Approved service hours</span><span className="font-semibold">{item.verifiedHours} / {item.requiredHours}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[var(--primary-blue)]" style={{ width: `${Math.min(100, item.requiredHours ? item.verifiedHours / item.requiredHours * 100 : 100)}%` }} /></div></div><div className="mt-3 flex flex-wrap gap-2">{item.hoursRequirementMet ? <Badge tone="green">Hours requirement met</Badge> : <Badge tone="gold">More approved hours required</Badge>}{item.requirements.map((requirement) => <Badge key={requirement} tone="gray">{requirement}</Badge>)}</div><Button className="mt-4" type="button" onClick={() => { setStipendParticipantId(item.participantId); setStipend({ status: item.decision?.status ?? "PENDING_REVIEW", notes: item.decision?.notes ?? "" }); }}>Review eligibility</Button></Card>)}</div>{!report.eligibility.some((item) => item.stipendEnabled) ? <Card className="border-dashed p-8 text-center text-sm text-[var(--text-secondary)]">Stipend tracking is not enabled for any participant in this program.</Card> : null}</section>
    </div>}

    <Dialog open={Boolean(reviewEntry)} title="Review service hours" description={reviewEntry ? `${formatHours(reviewEntry.minutes)} submitted for ${reviewEntry.activity}.` : ""} onClose={() => setReviewEntry(undefined)}><form className="space-y-4" onSubmit={submitReview}><Select value={review.decision} onChange={(event) => setReview({ ...review, decision: event.target.value as MentorshipServiceHourStatus })}><option value="APPROVED">Approve hours</option><option value="REJECTED">Reject hours</option></Select><Textarea placeholder="Review notes (recommended when rejecting)" value={review.reviewNotes} onChange={(event) => setReview({ ...review, reviewNotes: event.target.value })} /><Button type="submit" disabled={reviewHours.isPending}>{reviewHours.isPending ? "Saving…" : review.decision === "APPROVED" ? <><CheckCircle2 className="h-4 w-4" /> Approve</> : <><XCircle className="h-4 w-4" /> Reject</>}</Button></form></Dialog>
    <Dialog open={Boolean(stipendParticipantId)} title="Stipend eligibility decision" description={selectedEligibility ? `${selectedEligibility.participant.firstName} ${selectedEligibility.participant.lastName} has ${selectedEligibility.verifiedHours} approved hours.` : ""} onClose={() => setStipendParticipantId(undefined)}><form className="space-y-4" onSubmit={submitStipend}><Select value={stipend.status} onChange={(event) => setStipend({ ...stipend, status: event.target.value as MentorshipStipendStatus })}><option value="PENDING_REVIEW">Pending review</option><option value="ELIGIBLE">Eligible</option><option value="INELIGIBLE">Ineligible</option><option value="APPROVED">Payment approved</option><option value="PAID">Paid</option></Select><Textarea placeholder="Decision notes and requirement verification" value={stipend.notes} onChange={(event) => setStipend({ ...stipend, notes: event.target.value })} /><Button type="submit" disabled={decideStipend.isPending}>{decideStipend.isPending ? "Saving…" : "Save decision"}</Button></form></Dialog>
  </>;
}

function Metric({ icon: Icon, label: text, value }: { icon: typeof Clock3; label: string; value: string | number }) { return <Card className="p-4"><Icon className="h-5 w-5 text-[var(--primary-blue)]" /><p className="mt-3 text-xs font-semibold uppercase text-[var(--text-secondary)]">{text}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>; }
function formatHours(minutes: number) { return `${Math.round(minutes / 6) / 10} hr${minutes === 60 ? "" : "s"}`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)); }
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }
function messageFrom(value: unknown) { if (!(value instanceof Error)) return "The request could not be completed."; try { const parsed = JSON.parse(value.message) as { message?: string | string[] }; return Array.isArray(parsed.message) ? parsed.message.join(" ") : parsed.message ?? value.message; } catch { return value.message; } }
