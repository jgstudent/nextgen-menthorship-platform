"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, BookOpenCheck, CheckCircle2, Clock3, Download, Flag, ListChecks, Target, UsersRound } from "lucide-react";
import { AccessDenied } from "@/components/auth/access-denied";
import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { canPreviewMentorship } from "@/lib/permissions";
import type { MentorshipMonitoringReport, MentorshipProgram } from "@/types/mentorship";

export default function MentorshipMonitoringPage() {
  const { user } = useAuth();
  const allowed = canPreviewMentorship(user?.role);
  const [programId, setProgramId] = useState("");
  const [cohortId, setCohortId] = useState("all");
  const programsQuery = useQuery({ queryKey: ["mentorship", "programs"], queryFn: () => api<MentorshipProgram[]>("/mentorship/programs"), enabled: Boolean(user) && allowed });
  const programs = programsQuery.data ?? [];
  const selectedProgram = programs.find((program) => program.id === programId) ?? programs[0];
  const selectedProgramId = selectedProgram?.id ?? "";
  const reportQuery = useQuery({ queryKey: ["mentorship", "monitoring", selectedProgramId], queryFn: () => api<MentorshipMonitoringReport>(`/mentorship/programs/${selectedProgramId}/monitoring`), enabled: Boolean(user) && allowed && Boolean(selectedProgramId) });
  const report = reportQuery.data;
  const selectedCohort = cohortId === "all" ? undefined : report?.cohorts.find((cohort) => cohort.id === cohortId);
  const metrics = selectedCohort ?? report?.summary;
  const rows = useMemo(() => report?.relationships.filter((row) => cohortId === "all" || row.cohortId === cohortId) ?? [], [report, cohortId]);
  const alerts = rows.filter((row) => row.inactive || row.overdueSessions > 0 || row.overdueActions > 0);

  if (!user) return null;
  if (!allowed) return <AccessDenied />;

  return <>
    <nav className="mb-4 text-sm text-[var(--text-secondary)]"><Link href="/programs/mentorship" className="hover:underline">Mentorship</Link><span> / Monitoring & reports</span></nav>
    <PageHeader title="Monitoring & reports" description="Cohort performance, completion, attendance, activity alerts, and exportable records." actions={<div className="flex flex-wrap gap-2"><Link href="/programs/mentorship/engagement" className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold"><Activity className="h-4 w-4" /> Engagement</Link><Button type="button" disabled={!report || !rows.length} onClick={() => report && downloadCsv(report, rows, selectedCohort?.name)}><Download className="h-4 w-4" /> Export CSV</Button></div>} />

    <Card className="mb-5 p-4"><div className="grid gap-3 sm:grid-cols-2"><Select aria-label="Program" value={selectedProgramId} onChange={(event) => { setProgramId(event.target.value); setCohortId("all"); }}><option value="" disabled>Select program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</Select><Select aria-label="Cohort" value={cohortId} onChange={(event) => setCohortId(event.target.value)}><option value="all">All cohorts</option>{report?.cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</Select></div></Card>

    {reportQuery.isLoading || programsQuery.isLoading ? <Card className="p-8 text-center">Preparing mentorship monitoring data…</Card> : reportQuery.isError ? <Card className="border-red-200 bg-red-50 p-5 text-red-700">The monitoring report could not be loaded. Restart the API and try again.</Card> : !report || !metrics ? <Card className="p-8 text-center">Select a mentorship program to view its report.</Card> : <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric icon={CheckCircle2} label="Target completion" value={`${metrics.completionRate}%`} detail={`${metrics.targetComplete} of ${metrics.relationships} relationships`} tone="green" />
        <Metric icon={Clock3} label="Verified hours" value={String(metrics.completedHours)} detail={`${metrics.completedSessions} completed sessions`} tone="blue" />
        <Metric icon={UsersRound} label="Attendance" value={`${metrics.attendanceRate}%`} detail={`${metrics.noShows} no-show${metrics.noShows === 1 ? "" : "s"}`} tone="blue" />
        <Metric icon={Target} label="Goal progress" value={`${metrics.goalProgressPercent}%`} detail={`${metrics.completedGoals} of ${metrics.totalGoals} goals complete`} tone="gold" />
        <Metric icon={BookOpenCheck} label="Resources" value={`${metrics.resourceCompletionRate}%`} detail={`${metrics.completedResources} of ${metrics.totalResources} complete`} tone="green" />
        <Metric icon={ListChecks} label="Actions" value={String(metrics.overdueActions)} detail={`${metrics.completedAssignments} of ${metrics.totalAssignments} complete`} tone="gold" />
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Cohort dashboard</h2><p className="text-sm text-[var(--text-secondary)]">Performance against each cohort’s session and hour requirements.</p></div><p className="text-xs text-[var(--text-secondary)]">Generated {formatDateTime(report.generatedAt)}</p></div>
        <div className="grid gap-4 xl:grid-cols-2">{report.cohorts.map((cohort) => <button key={cohort.id} type="button" onClick={() => setCohortId(cohort.id)} className={`rounded-xl border bg-[var(--card)] p-5 text-left transition hover:border-blue-300 ${cohortId === cohort.id ? "border-[var(--primary-blue)] ring-1 ring-blue-200" : "border-[var(--border)]"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{cohort.name}</p><p className="text-xs text-[var(--text-secondary)]">{formatDate(cohort.programStartDate)} – {formatDate(cohort.programEndDate)} · {cohort.relationships} relationship{cohort.relationships === 1 ? "" : "s"}</p></div><Badge tone={cohort.status === "ACTIVE" ? "green" : cohort.status === "PAUSED" ? "gold" : "gray"}>{label(cohort.status)}</Badge></div><div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3"><Progress label="Target completion" value={cohort.completionRate} /><Progress label="Attendance" value={cohort.attendanceRate} /><Progress label="Goal progress" value={cohort.goalProgressPercent} /><Progress label="Resource completion" value={cohort.resourceCompletionRate} /><div><p className="text-xs text-[var(--text-secondary)]">Engagement</p><p className="mt-1 font-semibold">{cohort.completedSessions} sessions · {cohort.completedHours} hours</p></div></div>{cohort.overdueSessions || cohort.overdueActions || cohort.inactiveRelationships ? <div className="mt-4 flex flex-wrap gap-2"><Badge tone="gold">{cohort.overdueSessions} overdue sessions</Badge><Badge tone="gold">{cohort.overdueActions} overdue actions</Badge><Badge tone="gold">{cohort.inactiveRelationships} inactive</Badge></div> : <p className="mt-4 text-xs font-medium text-emerald-700">No activity alerts</p>}</button>)}</div>
      </section>

      <section>
        <div className="mb-3"><h2 className="text-lg font-semibold">Attention needed</h2><p className="text-sm text-[var(--text-secondary)]">Overdue sessions, overdue follow-up actions, and relationships without activity for {report.inactivityThresholdDays} days.</p></div>
        {alerts.length ? <div className="space-y-3">{alerts.map((row) => <Card key={row.id} className="border-amber-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" /><div><p className="font-semibold">{row.providerName} → {row.menteeName}</p><p className="text-sm text-[var(--text-secondary)]">{row.cohortName} · Last activity {formatDate(row.lastActivityAt)}</p></div></div><div className="flex gap-2">{row.overdueSessions ? <Badge tone="gold">{row.overdueSessions} overdue session{row.overdueSessions === 1 ? "" : "s"}</Badge> : null}{row.overdueActions ? <Badge tone="gold">{row.overdueActions} overdue action{row.overdueActions === 1 ? "" : "s"}</Badge> : null}{row.inactive ? <Badge tone="gold">Inactive</Badge> : null}</div></div></Card>)}</div> : <Card className="border-dashed p-6 text-center text-sm text-[var(--text-secondary)]">No overdue sessions, overdue actions, or inactive relationships for this selection.</Card>}
      </section>

      <section>
        <div className="mb-3"><h2 className="text-lg font-semibold">Relationship performance</h2><p className="text-sm text-[var(--text-secondary)]">Detailed progress used in the downloadable report.</p></div>
        {rows.length ? <Card className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left text-sm"><thead className="border-b border-[var(--border)] bg-slate-50 text-xs uppercase text-[var(--text-secondary)]"><tr><th className="p-4">Relationship</th><th className="p-4">Sessions</th><th className="p-4">Hours</th><th className="p-4">Attendance</th><th className="p-4">Goals</th><th className="p-4">Resources</th><th className="p-4">Actions</th><th className="p-4">Last activity</th><th className="p-4">Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-[var(--border)] last:border-0"><td className="p-4"><p className="font-semibold">{row.providerName} → {row.menteeName}</p><p className="text-xs text-[var(--text-secondary)]">{label(row.providerRole)} · {row.cohortName}</p></td><td className="p-4">{row.completedSessions} / {row.requiredSessions}</td><td className="p-4">{row.completedHours} / {row.expectedHours}</td><td className="p-4">{row.attendanceRate}%</td><td className="p-4">{row.goalProgressPercent}%</td><td className="p-4">{row.completedResources} / {row.totalResources}</td><td className="p-4">{row.completedAssignments} / {row.totalAssignments}</td><td className="p-4">{formatDate(row.lastActivityAt)}</td><td className="p-4"><div className="flex flex-wrap gap-1">{row.targetComplete ? <Badge tone="green">Target met</Badge> : <Badge tone="blue">In progress</Badge>}{row.inactive || row.overdueSessions || row.overdueActions ? <Badge tone="gold">Needs attention</Badge> : null}</div></td></tr>)}</tbody></table></Card> : <Card className="border-dashed p-8 text-center text-sm text-[var(--text-secondary)]">No mentorship relationships are available for this selection.</Card>}
      </section>
    </div>}
  </>;
}

function Metric({ icon: Icon, label: text, value, detail, tone }: { icon: typeof Flag; label: string; value: string; detail: string; tone: "green" | "blue" | "gold" }) {
  const colors = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "gold" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";
  return <Card className="p-4"><div className={`inline-flex rounded-lg p-2 ${colors}`}><Icon className="h-4 w-4" /></div><p className="mt-3 text-xs font-semibold uppercase text-[var(--text-secondary)]">{text}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{detail}</p></Card>;
}

function Progress({ label: text, value }: { label: string; value: number }) {
  return <div><div className="flex justify-between text-xs"><span className="text-[var(--text-secondary)]">{text}</span><span className="font-semibold">{value}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[var(--primary-blue)]" style={{ width: `${Math.min(100, value)}%` }} /></div></div>;
}

function downloadCsv(report: MentorshipMonitoringReport, rows: MentorshipMonitoringReport["relationships"], cohortName?: string) {
  const headers = ["Cohort", "Provider role", "Provider", "Provider email", "Mentee", "Mentee email", "Relationship status", "Completed sessions", "Required sessions", "Verified hours", "Expected hours", "Attendance rate", "Completed goals", "Total goals", "Goal progress", "Completed resources", "Total resources", "Resource completion", "Completed actions", "Total actions", "Overdue actions", "Overdue sessions", "Inactive", "Target complete", "Last activity"];
  const values = rows.map((row) => [row.cohortName, label(row.providerRole), row.providerName, row.providerEmail, row.menteeName, row.menteeEmail, label(row.status), row.completedSessions, row.requiredSessions, row.completedHours, row.expectedHours, `${row.attendanceRate}%`, row.completedGoals, row.totalGoals, `${row.goalProgressPercent}%`, row.completedResources, row.totalResources, `${row.resourceCompletionRate}%`, row.completedAssignments, row.totalAssignments, row.overdueActions, row.overdueSessions, row.inactive ? "Yes" : "No", row.targetComplete ? "Yes" : "No", row.lastActivityAt]);
  const csv = [headers, ...values].map((line) => line.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${report.program.code}-${cohortName ?? "all-cohorts"}-monitoring.csv`.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }
