"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, BookOpenCheck, CirclePlus, ExternalLink, UsersRound } from "lucide-react";
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
import type { MentorshipProgram, MentorshipRelationship, MentorshipResource, MentorshipResourceType } from "@/types/mentorship";

const resourceTypes: MentorshipResourceType[] = ["LINK", "DOCUMENT", "VIDEO", "ARTICLE", "TEMPLATE", "OTHER"];
const emptyResource = { title: "", description: "", type: "LINK" as MentorshipResourceType, url: "", tags: "" };
const emptyAssignment = { relationshipId: "", assignee: "MENTEE", goalId: "", sessionId: "", dueDate: "", notes: "" };

export default function MentorshipResourcesPage() {
  const { user } = useAuth();
  const allowed = canPreviewMentorship(user?.role);
  const client = useQueryClient();
  const [programId, setProgramId] = useState("");
  const [resourceDialog, setResourceDialog] = useState(false);
  const [assignmentResource, setAssignmentResource] = useState<MentorshipResource>();
  const [resource, setResource] = useState(emptyResource);
  const [assignment, setAssignment] = useState(emptyAssignment);
  const [error, setError] = useState<string>();
  const [resourceError, setResourceError] = useState<string>();
  const programsQuery = useQuery({ queryKey: ["mentorship", "programs"], queryFn: () => api<MentorshipProgram[]>("/mentorship/programs"), enabled: Boolean(user) && allowed });
  const programs = programsQuery.data ?? [];
  const selectedProgram = programs.find((item) => item.id === programId) ?? programs[0];
  const selectedProgramId = selectedProgram?.id ?? "";
  const resourcesQuery = useQuery({ queryKey: ["mentorship", "resources", selectedProgramId], queryFn: () => api<MentorshipResource[]>(`/mentorship/programs/${selectedProgramId}/resources`), enabled: Boolean(user) && allowed && Boolean(selectedProgramId) });
  const relationshipsQuery = useQuery({ queryKey: ["mentorship", "relationships", selectedProgramId], queryFn: () => api<MentorshipRelationship[]>(`/mentorship/programs/${selectedProgramId}/relationships`), enabled: Boolean(user) && allowed && Boolean(selectedProgramId) });
  const relationships = relationshipsQuery.data ?? [];
  const selectedRelationship = relationships.find((item) => item.id === assignment.relationshipId);
  const refresh = () => client.invalidateQueries({ queryKey: ["mentorship", "resources", selectedProgramId] });
  const options = { onSuccess: async () => { setError(undefined); await refresh(); }, onError: (caught: unknown) => setError(messageFrom(caught)) };
  const createResource = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/mentorship/programs/${selectedProgramId}/resources`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      setError(undefined);
      setResourceError(undefined);
      await refresh();
    },
    onError: (caught: unknown) => setResourceError(messageFrom(caught)),
  });
  const assignResource = useMutation({ mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api(`/mentorship/programs/${selectedProgramId}/resources/${id}/assignments`, { method: "POST", body: JSON.stringify(body) }), ...options });
  const archiveResource = useMutation({ mutationFn: (id: string) => api(`/mentorship/programs/${selectedProgramId}/resources/${id}`, { method: "DELETE" }), ...options });

  if (!user) return null;
  if (!allowed) return <AccessDenied />;

  function submitResource(event: FormEvent) {
    event.preventDefault();
    const normalizedUrl = normalizeResourceUrl(resource.url);
    try {
      const parsed = new URL(normalizedUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("Unsupported protocol");
    } catch {
      setResourceError("Enter a valid web address, for example https://nextgenhaitian.org/.");
      return;
    }
    setResourceError(undefined);
    createResource.mutate({ title: resource.title, description: resource.description || undefined, type: resource.type, url: normalizedUrl, tags: splitList(resource.tags) }, { onSuccess: () => { setResourceDialog(false); setResource(emptyResource); } });
  }

  function submitAssignment(event: FormEvent) {
    event.preventDefault();
    if (!assignmentResource || !selectedRelationship) return;
    const assigneeParticipantIds = assignment.assignee === "BOTH" ? [selectedRelationship.mentee.id, selectedRelationship.provider.id] : [assignment.assignee === "PROVIDER" ? selectedRelationship.provider.id : selectedRelationship.mentee.id];
    assignResource.mutate({ id: assignmentResource.id, body: { relationshipId: selectedRelationship.id, assigneeParticipantIds, goalId: assignment.goalId || undefined, sessionId: assignment.sessionId || undefined, dueDate: assignment.dueDate || undefined, notes: assignment.notes || undefined } }, { onSuccess: () => { setAssignmentResource(undefined); setAssignment(emptyAssignment); } });
  }

  return <>
    <nav className="mb-4 text-sm text-[var(--text-secondary)]"><Link href="/programs/mentorship" className="hover:underline">Mentorship</Link><span> / Resource Center</span></nav>
    <PageHeader title="Mentorship Resource Center" description="Share learning materials, assign them to mentorship work, and monitor completion." actions={<Button type="button" onClick={() => { setResourceError(undefined); setResourceDialog(true); }} disabled={!selectedProgramId}><CirclePlus className="h-4 w-4" /> Add resource</Button>} />
    {error ? <Card className="mb-5 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card> : null}
    <Card className="mb-5 p-4"><Select aria-label="Program" value={selectedProgramId} onChange={(event) => setProgramId(event.target.value)}><option value="" disabled>Select program</option>{programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Card>
    {resourcesQuery.isLoading ? <Card className="p-8 text-center">Loading shared resources…</Card> : !resourcesQuery.data?.length ? <Card className="border-dashed p-10 text-center"><BookOpenCheck className="mx-auto h-10 w-10 text-[var(--primary-blue)]" /><h2 className="mt-3 font-semibold">No shared resources yet</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Add the first article, video, document, template, or learning link.</p></Card> : <div className="grid gap-4 xl:grid-cols-2">{resourcesQuery.data.map((item) => <Card key={item.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge tone="blue">{label(item.type)}</Badge><h2 className="font-semibold">{item.title}</h2></div>{item.description ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.description}</p> : null}<div className="mt-2 flex flex-wrap gap-1">{item.tags.map((tag) => <Badge key={tag} tone="gray">{tag}</Badge>)}</div></div><Button type="button" className="border border-[var(--border)] bg-white text-[var(--text-secondary)] shadow-none" aria-label={`Archive ${item.title}`} onClick={() => { if (window.confirm("Archive this resource? Existing completion history will be retained.")) archiveResource.mutate(item.id); }}><Archive className="h-4 w-4" /></Button></div><div className="mt-4 flex flex-wrap gap-2"><a href={item.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold"><ExternalLink className="h-4 w-4" /> Open</a><Button type="button" onClick={() => { setAssignmentResource(item); setAssignment(emptyAssignment); }}><UsersRound className="h-4 w-4" /> Assign</Button></div><div className="mt-4 border-t border-[var(--border)] pt-3"><div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Assigned</span><span className="font-semibold">{item.assignments.length}</span></div><div className="mt-1 flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Completed</span><span className="font-semibold text-emerald-700">{item.assignments.filter((entry) => entry.status === "COMPLETED").length}</span></div>{item.assignments.length ? <div className="mt-3 space-y-2">{item.assignments.map((entry) => <div key={entry.id} className="rounded-md bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-2"><span className="font-medium">{entry.assignee?.application.firstName} {entry.assignee?.application.lastName}</span><Badge tone={entry.status === "COMPLETED" ? "green" : entry.status === "IN_PROGRESS" ? "blue" : "gold"}>{label(entry.status)}</Badge></div><p className="mt-1 text-xs text-[var(--text-secondary)]">{entry.relationship?.cohort?.name}{entry.goal ? ` · Goal: ${entry.goal.title}` : ""}{entry.session ? ` · Session: ${entry.session.title}` : ""}{entry.dueDate ? ` · Due ${formatDate(entry.dueDate)}` : ""}</p></div>)}</div> : null}</div></Card>)}</div>}

    <Dialog open={resourceDialog} title="Add shared resource" description="Add a safe link to learning material for this mentorship program." onClose={() => { setResourceError(undefined); setResourceDialog(false); }}><form className="space-y-4" onSubmit={submitResource}>{resourceError ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{resourceError}</div> : null}<Input placeholder="Resource title" value={resource.title} onChange={(event) => setResource({ ...resource, title: event.target.value })} required /><Select value={resource.type} onChange={(event) => setResource({ ...resource, type: event.target.value as MentorshipResourceType })}>{resourceTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</Select><div><Input type="text" inputMode="url" placeholder="https://example.org/resource" value={resource.url} onChange={(event) => { setResourceError(undefined); setResource({ ...resource, url: event.target.value }); }} onBlur={() => setResource({ ...resource, url: normalizeResourceUrl(resource.url) })} required /><p className="mt-1 text-xs text-[var(--text-secondary)]">You may paste a full address or enter a domain; https:// is added automatically.</p></div><Textarea placeholder="Description" value={resource.description} onChange={(event) => setResource({ ...resource, description: event.target.value })} /><Input placeholder="Tags, comma separated" value={resource.tags} onChange={(event) => setResource({ ...resource, tags: event.target.value })} /><Button type="submit" disabled={createResource.isPending}>{createResource.isPending ? "Saving…" : "Add resource"}</Button></form></Dialog>

    <Dialog open={Boolean(assignmentResource)} title="Assign resource" description={assignmentResource ? `Assign “${assignmentResource.title}” to one or both people in a relationship.` : ""} onClose={() => setAssignmentResource(undefined)}><form className="space-y-4" onSubmit={submitAssignment}><Select value={assignment.relationshipId} onChange={(event) => setAssignment({ ...emptyAssignment, relationshipId: event.target.value })} required><option value="">Select relationship</option>{relationships.map((item) => <option key={item.id} value={item.id}>{item.provider.application.firstName} {item.provider.application.lastName} → {item.mentee.application.firstName} {item.mentee.application.lastName} · {item.cohort.name}</option>)}</Select><Select value={assignment.assignee} onChange={(event) => setAssignment({ ...assignment, assignee: event.target.value })}><option value="MENTEE">Mentee</option><option value="PROVIDER">Mentor or tutor</option><option value="BOTH">Both participants</option></Select><Select value={assignment.goalId} onChange={(event) => setAssignment({ ...assignment, goalId: event.target.value, sessionId: "" })} disabled={!selectedRelationship}><option value="">General relationship resource</option>{selectedRelationship?.goals.map((goal) => <option key={goal.id} value={goal.id}>Goal: {goal.title}</option>)}</Select><Select value={assignment.sessionId} onChange={(event) => setAssignment({ ...assignment, sessionId: event.target.value, goalId: "" })} disabled={!selectedRelationship}><option value="">No session selected</option>{selectedRelationship?.sessions.map((session) => <option key={session.id} value={session.id}>Session: {session.title} · {formatDate(session.scheduledStart)}</option>)}</Select><label className="text-sm text-[var(--text-secondary)]">Due date<Input className="mt-1" type="date" value={assignment.dueDate} onChange={(event) => setAssignment({ ...assignment, dueDate: event.target.value })} /></label><Textarea placeholder="Assignment instructions (optional)" value={assignment.notes} onChange={(event) => setAssignment({ ...assignment, notes: event.target.value })} /><Button type="submit" disabled={assignResource.isPending || !selectedRelationship}>{assignResource.isPending ? "Assigning…" : "Assign resource"}</Button></form></Dialog>
  </>;
}

function splitList(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function normalizeResourceUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const protocol = lower.startsWith("http://") ? "http://" : "https://";
  const address = trimmed.replace(/^(https?:\/\/)+/i, "");
  return `${protocol}${address}`;
}
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)); }
function messageFrom(value: unknown) { if (!(value instanceof Error)) return "The request could not be completed."; try { const parsed = JSON.parse(value.message) as { message?: string | string[] }; return Array.isArray(parsed.message) ? parsed.message.join(" ") : parsed.message ?? value.message; } catch { return value.message; } }
