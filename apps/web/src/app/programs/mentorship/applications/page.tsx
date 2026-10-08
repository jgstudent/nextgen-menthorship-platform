"use client";

import { FormEvent, ReactNode, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, CirclePlus, Clock3, UserRoundCheck, Users } from "lucide-react";
import { AccessDenied } from "@/components/auth/access-denied";
import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { canPreviewMentorship } from "@/lib/permissions";
import type { MentorshipApplication, MentorshipApplicationStatus, MentorshipMeetingMode, MentorshipParticipantRole, MentorshipProgram } from "@/types/mentorship";

type ApplicationForm = {
  cohortId: string; role: MentorshipParticipantRole | ""; firstName: string; lastName: string; email: string; phone: string; timeZone: string; languages: string;
  institution: string; degreeProgram: string; major: string; academicLevel: string; graduationYear: string; meetingMode: MentorshipMeetingMode;
  expertise: string; capabilities: string; supportNeeds: string; careerInterests: string; availability: string; hoursPerWeek: string; maximumMentees: string;
  primaryObjective: string; goals: string; currentChallenge: string; motivation: string; experience: string; consent: boolean;
};
type MentorshipNotification = { id: string; title: string; message: string; readAt?: string; createdAt: string; application: { id: string; firstName: string; lastName: string; role: MentorshipParticipantRole; status: MentorshipApplicationStatus } };

const emptyForm = (): ApplicationForm => ({ cohortId: "", role: "", firstName: "", lastName: "", email: "", phone: "", timeZone: "America/New_York", languages: "English", institution: "", degreeProgram: "", major: "", academicLevel: "", graduationYear: "", meetingMode: "VIRTUAL", expertise: "", capabilities: "", supportNeeds: "", careerInterests: "", availability: "", hoursPerWeek: "", maximumMentees: "", primaryObjective: "", goals: "", currentChallenge: "", motivation: "", experience: "", consent: false });

export default function MentorshipApplicationsPage() {
  const { user } = useAuth();
  const allowed = canPreviewMentorship(user?.role);
  const canApproveAccess = user?.role === "SUPER_ADMIN";
  const queryClient = useQueryClient();
  const [programId, setProgramId] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ApplicationForm>(emptyForm());
  const [reviewing, setReviewing] = useState<MentorshipApplication>();
  const [reviewNotes, setReviewNotes] = useState("");
  const [error, setError] = useState<string>();

  const programsQuery = useQuery({ queryKey: ["mentorship", "programs"], queryFn: () => api<MentorshipProgram[]>("/mentorship/programs"), enabled: Boolean(user) && allowed });
  const programs = programsQuery.data ?? [];
  const activeProgramId = programId || programs[0]?.id || "";
  const activeProgram = programs.find((program) => program.id === activeProgramId);
  const applicationsQuery = useQuery({ queryKey: ["mentorship", "applications", activeProgramId], queryFn: () => api<MentorshipApplication[]>(`/mentorship/programs/${activeProgramId}/applications`), enabled: Boolean(user) && allowed && Boolean(activeProgramId) });
  const notificationsQuery = useQuery({ queryKey: ["mentorship", "notifications", activeProgramId], queryFn: () => api<MentorshipNotification[]>(`/mentorship/programs/${activeProgramId}/notifications`), enabled: Boolean(user) && allowed && Boolean(activeProgramId) });
  const applications = applicationsQuery.data ?? [];
  const activeCohort = activeProgram?.cohorts.find((cohort) => cohort.id === form.cohortId);
  const roleEligibility = form.role === "MENTOR" ? activeCohort?.mentorEligibility : form.role === "TUTOR" ? activeCohort?.tutorEligibility : activeCohort?.menteeEligibility;
  const academicLevelOptions = academicLevelsFrom(roleEligibility, form.role);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["mentorship", "applications", activeProgramId] });
  const markRead = useMutation({ mutationFn: (id: string) => api(`/mentorship/programs/${activeProgramId}/notifications/${id}/read`, { method: "POST" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mentorship", "notifications", activeProgramId] }) });

  const createApplication = useMutation({
    mutationFn: (body: Record<string, unknown>) => api<MentorshipApplication>(`/mentorship/programs/${activeProgramId}/applications`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => { setCreating(false); setForm(emptyForm()); setError(undefined); await refresh(); },
    onError: (caught) => setError(messageFrom(caught))
  });
  const reviewApplication = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: MentorshipApplicationStatus }) => api<MentorshipApplication>(`/mentorship/programs/${activeProgramId}/applications/${id}/review`, { method: "POST", body: JSON.stringify({ decision, notes: reviewNotes || undefined }) }),
    onSuccess: async () => { setReviewing(undefined); setReviewNotes(""); setError(undefined); await refresh(); },
    onError: (caught) => setError(messageFrom(caught))
  });

  if (!user) return null;
  if (!allowed) return <AccessDenied />;

  function openCreate() {
    setError(undefined);
    setForm({ ...emptyForm(), cohortId: activeProgram?.cohorts[0]?.id ?? "" });
    setCreating(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!form.role) return setError("Select whether this applicant is a mentor, tutor, or mentee.");
    createApplication.mutate({
      cohortId: form.cohortId, role: form.role, source: "ADMIN_CREATED", firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone || undefined,
      timeZone: form.timeZone, languages: splitList(form.languages), institution: form.institution || undefined, degreeProgram: form.degreeProgram || undefined, major: form.major || undefined,
      academicLevel: form.academicLevel || undefined, graduationYear: optionalNumber(form.graduationYear), meetingMode: form.meetingMode,
      expertise: form.expertise ? { summary: form.expertise } : undefined, mentoringCapabilities: splitList(form.capabilities), supportNeeds: splitList(form.supportNeeds), careerInterests: splitList(form.careerInterests),
      availability: form.availability ? { summary: form.availability } : {}, hoursPerWeek: optionalNumber(form.hoursPerWeek), maximumMentees: optionalNumber(form.maximumMentees),
      primaryObjective: form.primaryObjective || undefined, goals: form.goals || undefined, currentChallenge: form.currentChallenge || undefined, motivation: form.motivation || undefined, experience: form.experience || undefined,
      consentItems: { programRules: form.consent }, submit: true
    });
  }

  const pending = applications.filter((application) => ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFORMATION"].includes(application.status)).length;
  const participants = applications.filter((application) => application.participant).length;

  return <>
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-[var(--text-secondary)]"><Link href="/programs/mentorship" className="hover:underline">Mentorship</Link><span aria-hidden="true"> / </span><span aria-current="page">Applications</span></nav>
    <PageHeader title="Participant applications" description="Create, review, and approve mentor, tutor, and mentee applications within a cohort." actions={<div className="flex flex-wrap gap-2"><Link href="/programs/mentorship/participants" className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold"><UserRoundCheck className="h-4 w-4" /> Participants</Link><Button type="button" onClick={openCreate} disabled={!activeProgram?.cohorts.length}><CirclePlus className="h-4 w-4" /> Add applicant</Button></div>} />
    {error ? <Card className="mb-5 border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</Card> : null}
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><Metric icon={Users} label="Applications" value={applications.length} /><Metric icon={Clock3} label="Awaiting review" value={pending} /><Metric icon={UserRoundCheck} label="Participants created" value={participants} /></div>
    <Card className="mb-5 p-4"><label className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Program<Select className="mt-2" value={activeProgramId} onChange={(event) => setProgramId(event.target.value)}>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</Select></label></Card>
    {notificationsQuery.data?.some((item) => !item.readAt) ? <Card className="mb-5 p-4"><div className="mb-3 flex items-center gap-2"><Bell className="h-4 w-4 text-[var(--primary-blue)]" /><h2 className="font-semibold">New public applications</h2></div><div className="space-y-2">{notificationsQuery.data.filter((item) => !item.readAt).map((item) => <button key={item.id} type="button" onClick={() => markRead.mutate(item.id)} className="block w-full rounded-lg border border-blue-200 bg-blue-50 p-3 text-left"><p className="text-sm font-semibold text-blue-900">{item.title}</p><p className="mt-1 text-sm text-blue-800">{item.message}</p><p className="mt-1 text-xs text-blue-700">Open the application below to review it. Click this notice to mark it read.</p></button>)}</div></Card> : null}
    {programsQuery.isPending || applicationsQuery.isPending ? <Card className="p-8" role="status">Loading applications...</Card> : !activeProgram ? <Card className="p-8 text-center">Create a mentorship program and cohort before adding applicants.</Card> : !activeProgram.cohorts.length ? <Card className="p-8 text-center">This program needs a cohort before applications can be created.</Card> : applications.length ? <div className="space-y-4">{applications.map((application) => <ApplicationCard key={application.id} application={application} onReview={() => { setReviewing(application); setReviewNotes(application.reviewNotes ?? ""); }} />)}</div> : <Card className="border-dashed p-8 text-center text-sm text-[var(--text-secondary)]">No applications yet. Add the first mentor, tutor, or mentee applicant.</Card>}

    <Dialog open={creating} title="Add participant application" description="Administrative intake creates and submits the application for review." onClose={() => setCreating(false)}><form className="space-y-4" onSubmit={submit}>
      <Section title="Application context"><div className="grid gap-3 sm:grid-cols-2"><Select value={form.cohortId} onChange={(event) => setForm({ ...form, cohortId: event.target.value, academicLevel: "" })} required>{activeProgram?.cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</Select><Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as MentorshipParticipantRole, academicLevel: "" })} required><option value="" disabled>Select participant role</option><option value="MENTOR">Mentor</option><option value="TUTOR">Tutor</option><option value="MENTEE">Mentee</option></Select></div></Section>
      <Section title="Identity & contact"><div className="grid gap-3 sm:grid-cols-2"><Input placeholder="First name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required /><Input placeholder="Last name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required /><Input type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /><Input placeholder="Phone (private)" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /><Input placeholder="Time zone" value={form.timeZone} onChange={(event) => setForm({ ...form, timeZone: event.target.value })} required /><Input placeholder="Languages, comma separated" value={form.languages} onChange={(event) => setForm({ ...form, languages: event.target.value })} required /></div></Section>
      <Section title="Education"><div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Institution" value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })} /><Input placeholder="Degree/program" value={form.degreeProgram} onChange={(event) => setForm({ ...form, degreeProgram: event.target.value })} /><Input placeholder="Major" value={form.major} onChange={(event) => setForm({ ...form, major: event.target.value })} /><Select aria-label="Academic level" value={form.academicLevel} onChange={(event) => setForm({ ...form, academicLevel: event.target.value, graduationYear: event.target.value === "Professional" ? "" : form.graduationYear })} required><option value="" disabled>Select academic level</option>{academicLevelOptions.length ? academicLevelOptions.map((level) => <option key={level} value={level}>{level}</option>) : <option value="" disabled>No academic levels configured for this role</option>}</Select><Input type="number" min="1900" max="2200" placeholder={form.academicLevel === "Professional" ? "Graduation year not required" : form.role === "MENTEE" ? "Graduation year (required)" : "Graduation year (optional)"} value={form.graduationYear} onChange={(event) => setForm({ ...form, graduationYear: event.target.value })} disabled={form.academicLevel === "Professional"} required={form.role === "MENTEE"} /><Select value={form.meetingMode} onChange={(event) => setForm({ ...form, meetingMode: event.target.value as MentorshipMeetingMode })}><option value="VIRTUAL">Virtual</option><option value="IN_PERSON">In person</option><option value="HYBRID">Hybrid</option></Select></div></Section>
      {form.role === "MENTOR" || form.role === "TUTOR" ? <Section title={`${form.role === "TUTOR" ? "Tutor" : "Mentor"} profile`}><Input placeholder="Expertise (for example: Mathematics, Advanced; Linux, Advanced)" value={form.expertise} onChange={(event) => setForm({ ...form, expertise: event.target.value })} required /><Input placeholder={`${form.role === "TUTOR" ? "Tutoring" : "Mentoring"} capabilities, comma separated`} value={form.capabilities} onChange={(event) => setForm({ ...form, capabilities: event.target.value })} required /><div className="grid gap-3 sm:grid-cols-2"><Input type="number" min="1" max="40" placeholder="Hours available per week" value={form.hoursPerWeek} onChange={(event) => setForm({ ...form, hoursPerWeek: event.target.value })} /><Input type="number" min="1" max="20" placeholder="Maximum students" value={form.maximumMentees} onChange={(event) => setForm({ ...form, maximumMentees: event.target.value })} /></div><Textarea placeholder={`Why do they want to ${form.role === "TUTOR" ? "tutor" : "mentor"}?`} value={form.motivation} onChange={(event) => setForm({ ...form, motivation: event.target.value })} /><Textarea placeholder="Relevant mentoring, tutoring, leadership, or professional experience" value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} /></Section> : form.role === "MENTEE" ? <Section title="Mentee profile"><Input placeholder="Support needs, comma separated" value={form.supportNeeds} onChange={(event) => setForm({ ...form, supportNeeds: event.target.value })} required /><Input placeholder="Career interests, comma separated" value={form.careerInterests} onChange={(event) => setForm({ ...form, careerInterests: event.target.value })} /><Input placeholder="Primary objective" value={form.primaryObjective} onChange={(event) => setForm({ ...form, primaryObjective: event.target.value })} /><Textarea placeholder="What would they most like to accomplish?" value={form.goals} onChange={(event) => setForm({ ...form, goals: event.target.value })} required /><Textarea placeholder="Current academic or professional challenge" value={form.currentChallenge} onChange={(event) => setForm({ ...form, currentChallenge: event.target.value })} /></Section> : null}
      <Section title="Availability & consent"><Textarea placeholder="Recurring availability" value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })} /><label className="flex items-start gap-2 text-sm"><input className="mt-1 h-4 w-4" type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} required /><span>Program rules, privacy notice, and required consent items have been acknowledged.</span></label></Section>
      <Button type="submit" disabled={createApplication.isPending}>{createApplication.isPending ? "Submitting..." : "Create and submit"}</Button>
    </form></Dialog>

    <Dialog open={Boolean(reviewing)} title={reviewing ? `Review ${reviewing.firstName} ${reviewing.lastName}` : "Review application"} description={reviewing ? `${label(reviewing.role)} · ${reviewing.cohort.name}` : undefined} onClose={() => setReviewing(undefined)}>{reviewing ? <div className="space-y-4"><ApplicationSummary application={reviewing} /><div className="rounded-lg border border-[var(--border)] p-3 text-sm"><span className="text-[var(--text-secondary)]">Current decision: </span><span className="font-semibold">{label(reviewing.status)}</span>{reviewing.participant ? <span className="ml-2 text-[var(--text-secondary)]">· Participant status: {label(reviewing.participant.status)}</span> : null}</div><Textarea placeholder="Review notes or a message for the applicant" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} disabled={!canApproveAccess || !isReviewable(reviewing.status)} />{isReviewable(reviewing.status) && canApproveAccess ? <div className="flex flex-wrap gap-2">{reviewing.status === "SUBMITTED" ? <Button type="button" className="border border-[var(--border)] bg-white text-[var(--text-primary)] shadow-none" onClick={() => reviewApplication.mutate({ id: reviewing.id, decision: "UNDER_REVIEW" })}>Start review</Button> : null}<Button type="button" className="border border-amber-300 bg-amber-50 text-amber-800 shadow-none" onClick={() => reviewApplication.mutate({ id: reviewing.id, decision: "NEEDS_INFORMATION" })}>Request information</Button><Button type="button" onClick={() => reviewApplication.mutate({ id: reviewing.id, decision: reviewing.role === "MENTEE" ? "ELIGIBLE" : "APPROVED" })}><CheckCircle2 className="h-4 w-4" /> {reviewing.role === "MENTEE" ? "Mark eligible" : `Approve ${label(reviewing.role).toLowerCase()}`}</Button><Button type="button" className="bg-red-700 hover:bg-red-800" onClick={() => reviewApplication.mutate({ id: reviewing.id, decision: reviewing.role === "MENTEE" ? "INELIGIBLE" : "REJECTED" })}>{reviewing.role === "MENTEE" ? "Mark ineligible" : "Reject"}</Button></div> : isReviewable(reviewing.status) ? <p className="text-sm text-[var(--text-secondary)]">Only a Super Admin can approve access and send the Pilye invitation.</p> : <p className="text-sm text-[var(--text-secondary)]">This decision is complete. The application remains available for the audit record.</p>}</div> : null}</Dialog>
  </>;
}

function ApplicationCard({ application, onReview }: { application: MentorshipApplication; onReview: () => void }) {
  const reviewable = isReviewable(application.status);
  return <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{application.firstName} {application.lastName}</h3><Badge tone={application.role === "MENTOR" ? "blue" : application.role === "TUTOR" ? "green" : "gold"}>{label(application.role)}</Badge><Badge tone={statusTone(application.status)}>{label(application.status)}</Badge>{application.participant ? <Badge tone={application.participant.status === "MATCHING_POOL" ? "green" : "gold"}>{label(application.participant.status)}</Badge> : null}</div><p className="mt-1 text-sm text-[var(--text-secondary)]">{application.email} · {application.cohort.name}</p></div><Button type="button" onClick={onReview}>{reviewable ? "Review" : "View decision"}</Button></div><ApplicationSummary application={application} /></Card>;
}

function ApplicationSummary({ application }: { application: MentorshipApplication }) {
  return <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Education" value={[application.institution, application.major, application.academicLevel].filter(Boolean).join(" · ") || "Not provided"} /><Detail label="Languages" value={application.languages.join(", ") || "Not provided"} /><Detail label={application.role === "MENTEE" ? "Support needs" : "Capabilities"} value={(application.role === "MENTEE" ? application.supportNeeds : application.mentoringCapabilities).join(", ") || "Not provided"} /><Detail label="Meeting mode" value={application.meetingMode ? label(application.meetingMode) : "Not provided"} /></div>;
}

function Metric({ icon: Icon, label: text, value }: { icon: typeof Users; label: string; value: number }) { return <Card className="p-4"><Icon className="h-4 w-4 text-[var(--primary-blue)]" /><p className="mt-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">{text}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>; }
function Section({ title, children }: { title: string; children: ReactNode }) { return <fieldset className="space-y-3 rounded-lg border border-[var(--border)] p-4"><legend className="px-1 text-sm font-semibold">{title}</legend>{children}</fieldset>; }
function Detail({ label: text, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[var(--text-secondary)]">{text}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function splitList(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function optionalNumber(value: string) { return value ? Number(value) : undefined; }
function academicLevelsFrom(eligibility: Record<string, unknown> | undefined, role: MentorshipParticipantRole | "") {
  const levels = eligibility?.academicLevels;
  const configured = Array.isArray(levels) ? levels.filter((level): level is string => typeof level === "string") : [];
  if (role !== "MENTOR" && role !== "TUTOR") return configured;
  const providerLevels = configured.length ? configured : ["Junior", "Senior", "Graduate Student", "Recent Graduate"];
  return Array.from(new Set([...providerLevels, "Professional"]));
}
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }
function statusTone(status: MentorshipApplicationStatus): "blue" | "green" | "gold" | "red" | "gray" { if (["APPROVED", "ELIGIBLE"].includes(status)) return "green"; if (["REJECTED", "INELIGIBLE"].includes(status)) return "red"; if (["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFORMATION"].includes(status)) return "gold"; return "gray"; }
function isReviewable(status: MentorshipApplicationStatus) { return status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "NEEDS_INFORMATION"; }
function messageFrom(value: unknown) { if (!(value instanceof Error)) return "The request could not be completed."; try { const parsed = JSON.parse(value.message) as { message?: string | string[] }; return Array.isArray(parsed.message) ? parsed.message.join(" ") : parsed.message ?? value.message; } catch { return value.message; } }
