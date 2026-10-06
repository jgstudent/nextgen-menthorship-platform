"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Sparkles, UsersRound, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { MentorshipMatch, MentorshipMatchStatus, MentorshipProgram, MentorshipRelationship } from "@/types/mentorship";

export default function MentorshipMatchingPage() {
  const client = useQueryClient();
  const [programId, setProgramId] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [error, setError] = useState<string>();
  const programsQuery = useQuery({ queryKey: ["mentorship", "programs"], queryFn: () => api<MentorshipProgram[]>("/mentorship/programs") });
  const programs = programsQuery.data ?? [];
  const selectedProgram = programs.find((item) => item.id === programId) ?? programs[0];
  const selectedProgramId = selectedProgram?.id ?? "";
  const matchesQuery = useQuery({ queryKey: ["mentorship", "matches", selectedProgramId], queryFn: () => api<MentorshipMatch[]>(`/mentorship/programs/${selectedProgramId}/matches`), enabled: Boolean(selectedProgramId) });
  const relationshipsQuery = useQuery({ queryKey: ["mentorship", "relationships", selectedProgramId], queryFn: () => api<MentorshipRelationship[]>(`/mentorship/programs/${selectedProgramId}/relationships`), enabled: Boolean(selectedProgramId) });
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ["mentorship", "matches", selectedProgramId] }), client.invalidateQueries({ queryKey: ["mentorship", "relationships", selectedProgramId] })]); };
  const generate = useMutation({ mutationFn: () => api(`/mentorship/programs/${selectedProgramId}/cohorts/${cohortId}/matches/generate`, { method: "POST" }), onSuccess: async () => { setError(undefined); await refresh(); }, onError: (caught) => setError(messageFrom(caught)) });
  const decide = useMutation({ mutationFn: ({ id, decision }: { id: string; decision: "APPROVED" | "REJECTED" }) => api(`/mentorship/programs/${selectedProgramId}/matches/${id}/decision`, { method: "POST", body: JSON.stringify({ decision }) }), onSuccess: refresh, onError: (caught) => setError(messageFrom(caught)) });
  const matches = matchesQuery.data ?? [];
  const pending = matches.filter((item) => item.status === "PROPOSED").length;

  return <>
    <nav className="mb-4 text-sm text-[var(--text-secondary)]"><Link href="/programs/mentorship" className="hover:underline">Mentorship</Link><span> / Matching</span></nav>
    <PageHeader title="Matching recommendations" description="Generate compatibility recommendations, then approve or reject every proposed match." actions={<Link href="/programs/mentorship/participants" className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold"><UsersRound className="h-4 w-4" /> Participants</Link>} />
    {error ? <Card className="mb-5 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card> : null}
    <div className="mb-5 grid gap-3 sm:grid-cols-4"><Metric label="Pending approval" value={pending} /><Metric label="Approved" value={matches.filter((item) => item.status === "APPROVED" || item.status === "ACTIVE").length} /><Metric label="Active relationships" value={relationshipsQuery.data?.filter((item) => item.status === "ACTIVE").length ?? 0} /><Metric label="Rejected" value={matches.filter((item) => item.status === "REJECTED").length} /></div>
    <Card className="mb-5 p-5"><div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Select aria-label="Program" value={selectedProgramId} onChange={(event) => { setProgramId(event.target.value); setCohortId(""); }}><option value="" disabled>Select program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</Select><Select aria-label="Cohort" value={cohortId} onChange={(event) => setCohortId(event.target.value)}><option value="">Select cohort to generate recommendations</option>{selectedProgram?.cohorts.filter((cohort) => cohort.matchingEnabled).map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</Select><Button type="button" disabled={!cohortId || generate.isPending} onClick={() => generate.mutate()}><Sparkles className="h-4 w-4" /> {generate.isPending ? "Generating…" : "Generate matches"}</Button></div></Card>
    {matchesQuery.isLoading ? <Card className="p-8 text-center">Loading recommendations…</Card> : matches.length ? <div className="space-y-4">{matches.map((match) => <MatchCard key={match.id} match={match} pending={decide.isPending} onDecision={(decision) => decide.mutate({ id: match.id, decision })} />)}</div> : <Card className="border-dashed p-10 text-center"><Sparkles className="mx-auto h-9 w-9 text-[var(--primary-blue)]" /><h2 className="mt-3 font-semibold">No matching recommendations yet</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Approve participant applications first, then choose a cohort and generate recommendations.</p></Card>}
  </>;
}

function MatchCard({ match, pending, onDecision }: { match: MentorshipMatch; pending: boolean; onDecision: (decision: "APPROVED" | "REJECTED") => void }) {
  const provider = match.provider.application;
  const mentee = match.mentee.application;
  return <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{provider.firstName} {provider.lastName} → {mentee.firstName} {mentee.lastName}</h2><Badge tone={statusTone(match.status)}>{label(match.status)}</Badge><Badge tone="blue">{match.score}% match</Badge></div><p className="mt-1 text-sm text-[var(--text-secondary)]">{label(provider.role)} with Mentee · {match.cohort.name}</p></div>{match.status === "PROPOSED" ? <div className="flex gap-2"><Button type="button" disabled={pending} onClick={() => onDecision("APPROVED")}><CheckCircle2 className="h-4 w-4" /> Approve</Button><Button type="button" disabled={pending} className="bg-red-700 hover:bg-red-800" onClick={() => onDecision("REJECTED")}><XCircle className="h-4 w-4" /> Reject</Button></div> : match.approvedBy ? <p className="text-xs text-[var(--text-secondary)]">Approved by {match.approvedBy.firstName} {match.approvedBy.lastName}</p> : null}</div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Shared languages" value={String(match.scoreBreakdown.language ?? 0)} /><Detail label="Meeting mode" value={String(match.scoreBreakdown.meetingMode ?? 0)} /><Detail label="Needs alignment" value={String(match.scoreBreakdown.alignment ?? 0)} /><Detail label="Base compatibility" value={String(match.scoreBreakdown.base ?? 0)} /></div></Card>;
}

function Metric({ label: text, value }: { label: string; value: number }) { return <Card className="p-4"><p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">{text}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>; }
function Detail({ label: text, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[var(--text-secondary)]">{text}</p><p className="mt-1 font-semibold">{value} points</p></div>; }
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }
function statusTone(status: MentorshipMatchStatus): "blue" | "green" | "gold" | "red" | "gray" { if (status === "PROPOSED") return "gold"; if (status === "APPROVED" || status === "ACTIVE") return "green"; if (status === "REJECTED") return "red"; return "gray"; }
function messageFrom(value: unknown) { if (!(value instanceof Error)) return "The request could not be completed."; try { const parsed = JSON.parse(value.message) as { message?: string | string[] }; return Array.isArray(parsed.message) ? parsed.message.join(" ") : parsed.message ?? value.message; } catch { return value.message; } }
