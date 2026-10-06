"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { MentorshipMeetingMode, MentorshipParticipantRole, PublicMentorshipProgram } from "@/types/mentorship";

type Form = { cohortId: string; role: MentorshipParticipantRole | ""; firstName: string; lastName: string; email: string; phone: string; timeZone: string; languages: string; institution: string; degreeProgram: string; major: string; academicLevel: string; graduationYear: string; meetingMode: MentorshipMeetingMode; expertise: string; capabilities: string; supportNeeds: string; careerInterests: string; goals: string; motivation: string; experience: string; availability: string; consent: boolean; website: string };
const emptyForm = (): Form => ({ cohortId: "", role: "", firstName: "", lastName: "", email: "", phone: "", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York", languages: "", institution: "", degreeProgram: "", major: "", academicLevel: "", graduationYear: "", meetingMode: "VIRTUAL", expertise: "", capabilities: "", supportNeeds: "", careerInterests: "", goals: "", motivation: "", experience: "", availability: "", consent: false, website: "" });

export default function PublicMentorshipApplicationPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());
  const [error, setError] = useState<string>();
  useEffect(() => {
    void params.then((value) => setToken(value.token));
    setPreview(new URLSearchParams(window.location.search).get("preview") === "true");
  }, [params]);
  const programQuery = useQuery({ queryKey: ["public-mentorship", token, preview], queryFn: () => api<PublicMentorshipProgram>(`/public/mentorship/${token}${preview ? "?preview=true" : ""}`), enabled: Boolean(token), retry: false });
  useEffect(() => {
    const onlyCohort = programQuery.data?.cohorts.length === 1 ? programQuery.data.cohorts[0] : undefined;
    if (onlyCohort) setForm((current) => current.cohortId ? current : { ...current, cohortId: onlyCohort.id });
  }, [programQuery.data]);
  const selectedCohort = programQuery.data?.cohorts.find((item) => item.id === form.cohortId);
  const academicLevels = useMemo(() => {
    if (!selectedCohort || !form.role) return [];
    const eligibility = form.role === "MENTOR" ? selectedCohort.mentorEligibility : form.role === "TUTOR" ? selectedCohort.tutorEligibility : selectedCohort.menteeEligibility;
    const levels = Array.isArray(eligibility.academicLevels) ? eligibility.academicLevels.filter((item): item is string => typeof item === "string") : [];
    return form.role === "MENTEE" ? levels : Array.from(new Set([...levels, "Professional"]));
  }, [form.role, selectedCohort]);
  const submit = useMutation({
    mutationFn: (body: Record<string, unknown>) => api<{ id: string; programName: string }>(`/public/mentorship/${token}/applications`, { method: "POST", body: JSON.stringify(body) }),
    onError: (caught) => setError(messageFrom(caught))
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!form.role) return setError("Please select whether you are applying as a mentor, tutor, or mentee.");
    submit.mutate({ ...form, languages: splitList(form.languages), graduationYear: form.graduationYear ? Number(form.graduationYear) : undefined, expertise: form.expertise ? { summary: form.expertise } : {}, mentoringCapabilities: splitList(form.capabilities), supportNeeds: splitList(form.supportNeeds), careerInterests: splitList(form.careerInterests), availability: form.availability ? { summary: form.availability } : {}, consentItems: { programTerms: form.consent }, source: undefined, capabilities: undefined, consent: undefined });
  }

  if (programQuery.isLoading || !programQuery.data) return <PublicFrame><Card className="mx-auto max-w-2xl p-8 text-center text-sm text-[var(--text-secondary)]">{programQuery.isError ? "This application link is unavailable or no longer active." : "Loading application…"}</Card></PublicFrame>;
  const data = programQuery.data;
  if (submit.isSuccess) return <PublicFrame><Card className="mx-auto max-w-2xl p-10 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /><h1 className="mt-4 text-2xl font-bold">Application received</h1><p className="mt-2 text-[var(--text-secondary)]">Thank you. Your application for {submit.data.programName} was submitted for review.</p><p className="mt-2 text-sm text-[var(--text-secondary)]">The organization will contact you using the email address you provided.</p></Card></PublicFrame>;

  return <PublicFrame>
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">{data.organization.logoUrl ? <img src={data.organization.logoUrl} alt="" className="mx-auto mb-3 h-14 w-14 rounded-lg object-cover" /> : <GraduationCap className="mx-auto mb-3 h-10 w-10 text-[var(--primary-blue)]" />}<p className="text-sm font-semibold uppercase tracking-wide text-emerald-500">{data.organization.name}</p><h1 className="mt-2 text-3xl font-bold">Apply to {data.program.name}</h1><p className="mx-auto mt-2 max-w-2xl text-[var(--text-secondary)]">{data.program.description ?? "Submit your information for consideration. A portal account is not required."}</p></div>
      <Card className="p-5 sm:p-7"><form className="space-y-5" onSubmit={onSubmit}>
        {error ? <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <Section title="Application context"><div className="grid gap-3 sm:grid-cols-2"><Select aria-label="Cohort" value={form.cohortId} onChange={(event) => setForm({ ...form, cohortId: event.target.value, role: "", academicLevel: "" })} required><option value="" disabled>Select a cohort</option>{data.cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</Select><Select aria-label="Application role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as MentorshipParticipantRole, academicLevel: "", graduationYear: "" })} required disabled={!selectedCohort}><option value="" disabled>Select application type</option>{selectedCohort?.availableRoles.includes("MENTOR") ? <option value="MENTOR">Mentor</option> : null}{selectedCohort?.availableRoles.includes("TUTOR") ? <option value="TUTOR">Tutor</option> : null}{selectedCohort?.availableRoles.includes("MENTEE") ? <option value="MENTEE">Mentee</option> : null}</Select></div></Section>
        <Section title="Identity & contact"><div className="grid gap-3 sm:grid-cols-2"><Input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /><Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /><Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><Input placeholder="Phone (private)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><Input placeholder="Time zone" value={form.timeZone} onChange={(e) => setForm({ ...form, timeZone: e.target.value })} required /><Input placeholder="Languages, comma separated" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} required /></div></Section>
        <Section title="Education"><div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /><Input placeholder="Degree/program" value={form.degreeProgram} onChange={(e) => setForm({ ...form, degreeProgram: e.target.value })} /><Input placeholder="Major" value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} /><Select value={form.academicLevel} onChange={(e) => setForm({ ...form, academicLevel: e.target.value, graduationYear: e.target.value === "Professional" ? "" : form.graduationYear })} required><option value="" disabled>Select academic level</option>{academicLevels.map((level) => <option key={level} value={level}>{level}</option>)}</Select><Input type="number" min="1900" max="2200" placeholder={form.role === "MENTEE" ? "Graduation year (required)" : "Graduation year (optional)"} value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: e.target.value })} required={form.role === "MENTEE"} disabled={form.academicLevel === "Professional"} /><Select value={form.meetingMode} onChange={(e) => setForm({ ...form, meetingMode: e.target.value as MentorshipMeetingMode })}><option value="VIRTUAL">Virtual</option><option value="IN_PERSON">In person</option><option value="HYBRID">Hybrid</option></Select></div></Section>
        {form.role === "MENTOR" || form.role === "TUTOR" ? <Section title={`${form.role === "TUTOR" ? "Tutor" : "Mentor"} profile`}><Input placeholder="Areas of expertise" value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} required /><Input placeholder="Capabilities, comma separated" value={form.capabilities} onChange={(e) => setForm({ ...form, capabilities: e.target.value })} required /><Textarea placeholder={`Why do you want to ${form.role === "TUTOR" ? "tutor" : "mentor"}?`} value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })} /><Textarea placeholder="Relevant experience" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} /></Section> : form.role === "MENTEE" ? <Section title="Mentee profile"><Input placeholder="Support needs, comma separated" value={form.supportNeeds} onChange={(e) => setForm({ ...form, supportNeeds: e.target.value })} required /><Input placeholder="Career interests, comma separated" value={form.careerInterests} onChange={(e) => setForm({ ...form, careerInterests: e.target.value })} /><Textarea placeholder="What would you most like to accomplish?" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} required /></Section> : null}
        <Section title="Availability & consent"><Textarea placeholder="Recurring availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} /><input className="hidden" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /><label className="flex gap-2 text-sm"><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} required /><span>I acknowledge the program rules, privacy notice, and required consent items.</span></label></Section>
        <Button type="submit" disabled={submit.isPending}>{submit.isPending ? "Submitting…" : "Submit application"}</Button>
      </form></Card>
    </div>
  </PublicFrame>;
}

function PublicFrame({ children }: { children: ReactNode }) { return <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--text-primary)] sm:py-14">{children}</main>; }
function Section({ title, children }: { title: string; children: ReactNode }) { return <fieldset className="space-y-3 rounded-lg border border-[var(--border)] p-4"><legend className="px-1 text-sm font-semibold">{title}</legend>{children}</fieldset>; }
function splitList(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function messageFrom(value: unknown) { if (!(value instanceof Error)) return "The application could not be submitted."; try { const parsed = JSON.parse(value.message) as { message?: string | string[] }; return Array.isArray(parsed.message) ? parsed.message.join(" ") : parsed.message ?? value.message; } catch { return value.message; } }
