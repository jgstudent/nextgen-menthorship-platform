"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Clock, Plus, Trash2, Video } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { canCreateActionItems, canManageMeetings } from "@/lib/permissions";
import type { Meeting, MeetingActionItem, MeetingStatus, Project, User, Workspace } from "@/types/domain";

type MeetingForm = {
  title: string;
  description: string;
  workspaceId: string;
  projectId: string;
  location: string;
  videoUrl: string;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  agenda: string;
  notes: string;
  attendeeIds: string[];
};

type ActionItemForm = {
  title: string;
  description: string;
  assignedToId: string;
  dueDate: string;
};

const defaultMeetingForm: MeetingForm = {
  title: "",
  description: "",
  workspaceId: "",
  projectId: "",
  location: "",
  videoUrl: "",
  startTime: "",
  endTime: "",
  status: "SCHEDULED",
  agenda: "",
  notes: "",
  attendeeIds: []
};

const defaultActionItemForm: ActionItemForm = { title: "", description: "", assignedToId: "", dueDate: "" };

export function MeetingManagement({ calendar = false }: { calendar?: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const mayManageMeetings = canManageMeetings(user?.role);
  const mayCreateActionItems = canCreateActionItems(user?.role);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | MeetingStatus>("ALL");
  const [workspaceFilter, setWorkspaceFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));

  const meetingsQuery = useQuery({ queryKey: ["meetings"], queryFn: () => api<Meeting[]>("/meetings") });
  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: () => api<Workspace[]>("/workspaces") });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => api<Project[]>("/projects") });
  const membersQuery = useQuery({ queryKey: ["meeting-members"], queryFn: () => api<User[]>("/meetings/members") });

  const meetings = meetingsQuery.data ?? [];
  const selectedMeeting = meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null;
  const filteredMeetings = meetings.filter((meeting) => {
    if (statusFilter !== "ALL" && meeting.status !== statusFilter) return false;
    if (workspaceFilter !== "ALL" && meeting.workspaceId !== workspaceFilter) return false;
    if (projectFilter !== "ALL" && meeting.projectId !== projectFilter) return false;
    return true;
  });
  const todayMeetings = meetings.filter((meeting) => isSameDay(new Date(meeting.startTime), new Date()));
  const upcomingMeetings = meetings.filter((meeting) => new Date(meeting.startTime).getTime() >= Date.now() && meeting.status === "SCHEDULED").slice(0, 6);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["meetings"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["boards"] })
    ]);
  };

  const createMeeting = useMutation({
    mutationFn: (form: MeetingForm) => api<Meeting>("/meetings", { method: "POST", body: JSON.stringify(meetingPayload(form, workspacesQuery.data ?? [], projectsQuery.data ?? [])) }),
    onSuccess: async (meeting) => {
      setModal(null);
      setSelectedMeetingId(meeting.id);
      toast({ title: "Meeting created" });
      await invalidate();
    },
    onError: () => toast({ title: "Meeting was not created", description: "Check the required fields and try again.", tone: "error" })
  });

  const updateMeeting = useMutation({
    mutationFn: ({ id, form }: { id: string; form: MeetingForm }) => api<Meeting>(`/meetings/${id}`, { method: "PATCH", body: JSON.stringify(meetingPayload(form, workspacesQuery.data ?? [], projectsQuery.data ?? [])) }),
    onSuccess: async () => {
      setModal(null);
      toast({ title: "Meeting updated" });
      await invalidate();
    },
    onError: () => toast({ title: "Meeting was not updated", description: "Please try again.", tone: "error" })
  });

  const deleteMeeting = useMutation({
    mutationFn: (id: string) => api<Meeting>(`/meetings/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setModal(null);
      setSelectedMeetingId(null);
      toast({ title: "Meeting deleted" });
      await invalidate();
    },
    onError: () => toast({ title: "Meeting was not deleted", description: "Please try again.", tone: "error" })
  });

  const createActionItem = useMutation({
    mutationFn: ({ meetingId, form }: { meetingId: string; form: ActionItemForm }) => api<MeetingActionItem>(`/meetings/${meetingId}/action-items`, { method: "POST", body: JSON.stringify(actionItemPayload(form)) }),
    onSuccess: async () => {
      toast({ title: "Action item added" });
      await invalidate();
    },
    onError: () => toast({ title: "Action item was not added", description: "Please try again.", tone: "error" })
  });

  const convertActionItem = useMutation({
    mutationFn: ({ meetingId, actionItemId }: { meetingId: string; actionItemId: string }) => api(`/meetings/${meetingId}/action-items/${actionItemId}/convert-to-task`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: async () => {
      toast({ title: "Action item converted", description: "A task was created on the related board." });
      await invalidate();
    },
    onError: () => toast({ title: "Could not convert action item", description: "Make sure the meeting has an accessible project board.", tone: "error" })
  });

  if (meetingsQuery.isLoading) {
    return <MeetingSkeleton />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-panel lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | MeetingStatus)} className="w-40">
            <option value="ALL">All statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <Select value={workspaceFilter} onChange={(event) => setWorkspaceFilter(event.target.value)} className="w-52">
            <option value="ALL">All workspaces</option>
            {(workspacesQuery.data ?? []).map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </Select>
          <Select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="w-52">
            <option value="ALL">All projects</option>
            {(projectsQuery.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </Select>
        </div>
        {mayManageMeetings ? (
          <Button type="button" onClick={() => setModal("create")}>
            <Plus className="h-4 w-4" /> Create Meeting
          </Button>
        ) : null}
      </div>

      {calendar ? (
        <CalendarBoard meetings={filteredMeetings} month={monthCursor} todayMeetings={todayMeetings} upcomingMeetings={upcomingMeetings} onMonthChange={setMonthCursor} onSelectMeeting={setSelectedMeetingId} />
      ) : (
        <MeetingList meetings={filteredMeetings} onSelectMeeting={setSelectedMeetingId} />
      )}

      <MeetingDialog open={modal === "create"} title="Create meeting" members={membersQuery.data ?? []} workspaces={workspacesQuery.data ?? []} projects={projectsQuery.data ?? []} pending={createMeeting.isPending} onClose={() => setModal(null)} onSubmit={(form) => createMeeting.mutate(form)} />
      <MeetingDialog open={modal === "edit" && Boolean(selectedMeeting)} title="Edit meeting" meeting={selectedMeeting ?? undefined} members={membersQuery.data ?? []} workspaces={workspacesQuery.data ?? []} projects={projectsQuery.data ?? []} pending={updateMeeting.isPending} onClose={() => setModal(null)} onSubmit={(form) => selectedMeeting && updateMeeting.mutate({ id: selectedMeeting.id, form })} />
      <DeleteDialog open={modal === "delete" && Boolean(selectedMeeting)} pending={deleteMeeting.isPending} meeting={selectedMeeting ?? undefined} onClose={() => setModal(null)} onConfirm={() => selectedMeeting && deleteMeeting.mutate(selectedMeeting.id)} />
      <MeetingDrawer
        meeting={selectedMeeting}
        members={membersQuery.data ?? []}
        open={Boolean(selectedMeetingId)}
        canManage={mayManageMeetings}
        canCreateActionItems={mayCreateActionItems}
        actionPending={createActionItem.isPending}
        convertPending={convertActionItem.isPending}
        onClose={() => setSelectedMeetingId(null)}
        onEdit={() => setModal("edit")}
        onDelete={() => setModal("delete")}
        onCreateActionItem={(form) => selectedMeeting && createActionItem.mutate({ meetingId: selectedMeeting.id, form })}
        onConvertActionItem={(actionItemId) => selectedMeeting && convertActionItem.mutate({ meetingId: selectedMeeting.id, actionItemId })}
      />
    </div>
  );
}

function MeetingList({ meetings, onSelectMeeting }: { meetings: Meeting[]; onSelectMeeting: (id: string) => void }) {
  if (!meetings.length) {
    return <EmptyState title="No meetings found" description="Meetings you create or are invited to will appear here." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} onClick={() => onSelectMeeting(meeting.id)} />
      ))}
    </div>
  );
}

function MeetingCard({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  return (
    <Card className="cursor-pointer border-t-4 border-t-[#1D4ED8] p-5 transition hover:-translate-y-0.5 hover:shadow-soft" onClick={onClick}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[#0B1220]">{meeting.title}</h3>
          <p className="mt-1 text-sm text-[#64748B]">{meeting.project?.name ?? meeting.workspace?.name ?? "Organization-wide"}</p>
        </div>
        <MeetingStatusBadge status={meeting.status} />
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#64748B]">{meeting.description || meeting.agenda || "No description yet."}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#64748B]">
        <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {formatDateTime(meeting.startTime)}</span>
        {meeting.videoUrl ? <span className="inline-flex items-center gap-1 text-[#1D4ED8]"><Video className="h-4 w-4" /> Video</span> : null}
      </div>
    </Card>
  );
}

function CalendarBoard({ meetings, month, todayMeetings, upcomingMeetings, onMonthChange, onSelectMeeting }: { meetings: Meeting[]; month: Date; todayMeetings: Meeting[]; upcomingMeetings: Meeting[]; onMonthChange: (date: Date) => void; onSelectMeeting: (id: string) => void }) {
  const days = calendarDays(month);
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#0B1220]">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
            <p className="text-sm text-[#64748B]">Shared meeting calendar</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" className="bg-white text-[#1E293B] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]" onClick={() => onMonthChange(addMonths(month, -1))}>Previous</Button>
            <Button type="button" className="bg-white text-[#1E293B] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]" onClick={() => onMonthChange(addMonths(month, 1))}>Next</Button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-l border-t border-[#E2E8F0] text-xs font-semibold uppercase tracking-wide text-[#64748B]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="border-b border-r border-[#E2E8F0] bg-[#F8FAFC] p-2">{day}</div>)}
          {days.map((day) => {
            const dayMeetings = meetings.filter((meeting) => isSameDay(new Date(meeting.startTime), day));
            const muted = day.getMonth() !== month.getMonth();
            return (
              <div key={day.toISOString()} className={`min-h-28 border-b border-r border-[#E2E8F0] p-2 ${muted ? "bg-slate-50 text-slate-400" : "bg-white text-[#1E293B]"}`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isSameDay(day, new Date()) ? "bg-[#1D4ED8] text-white" : ""}`}>{day.getDate()}</span>
                </div>
                <div className="space-y-1">
                  {dayMeetings.slice(0, 3).map((meeting) => (
                    <button key={meeting.id} type="button" className="block w-full truncate rounded bg-[#DBEAFE] px-2 py-1 text-left text-xs font-semibold text-[#1D4ED8]" onClick={() => onSelectMeeting(meeting.id)}>
                      {meeting.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="space-y-5">
        <SideList title="Today's Meetings" meetings={todayMeetings} onSelectMeeting={onSelectMeeting} />
        <SideList title="Upcoming Meetings" meetings={upcomingMeetings} onSelectMeeting={onSelectMeeting} />
      </div>
    </div>
  );
}

function SideList({ title, meetings, onSelectMeeting }: { title: string; meetings: Meeting[]; onSelectMeeting: (id: string) => void }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-[#0B1220]">{title}</h3>
      <div className="mt-4 space-y-2">
        {meetings.length ? meetings.map((meeting) => (
          <button key={meeting.id} type="button" className="w-full rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-left transition hover:border-[#1D4ED8] hover:bg-white" onClick={() => onSelectMeeting(meeting.id)}>
            <p className="text-sm font-semibold text-[#1E293B]">{meeting.title}</p>
            <p className="text-xs text-[#64748B]">{formatDateTime(meeting.startTime)}</p>
          </button>
        )) : <p className="rounded-md border border-dashed border-[#CBD5E1] p-3 text-sm text-[#64748B]">Nothing scheduled.</p>}
      </div>
    </Card>
  );
}

function MeetingDrawer({ meeting, members, open, canManage, canCreateActionItems, actionPending, convertPending, onClose, onEdit, onDelete, onCreateActionItem, onConvertActionItem }: { meeting: Meeting | null; members: User[]; open: boolean; canManage: boolean; canCreateActionItems: boolean; actionPending: boolean; convertPending: boolean; onClose: () => void; onEdit: () => void; onDelete: () => void; onCreateActionItem: (form: ActionItemForm) => void; onConvertActionItem: (id: string) => void }) {
  const [form, setForm] = useState<ActionItemForm>(defaultActionItemForm);
  if (!meeting) return null;

  return (
    <Sheet open={open} title={meeting.title} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <MeetingStatusBadge status={meeting.status} />
          <Badge tone="blue"><CalendarDays className="mr-1 inline h-3 w-3" /> {formatDateTime(meeting.startTime)}</Badge>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button type="button" onClick={onEdit}>Edit meeting</Button>
            <Button type="button" className="bg-red-600 hover:bg-red-700" onClick={onDelete}><Trash2 className="h-4 w-4" /> Delete</Button>
          </div>
        ) : null}
        <InfoSection title="Agenda" value={meeting.agenda} empty="No agenda yet." />
        <InfoSection title="Notes" value={meeting.notes} empty="No notes yet." />
        <div>
          <h3 className="font-semibold text-[#0B1220]">Attendees</h3>
          <div className="mt-3 space-y-2">
            {(meeting.attendees ?? []).map((attendee) => (
              <div key={attendee.id} className="flex items-center justify-between rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <div className="flex items-center gap-3">
                  <Avatar user={attendee.user} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-[#1E293B]">{attendee.user ? `${attendee.user.firstName} ${attendee.user.lastName}` : "Member"}</p>
                    <p className="text-xs text-[#64748B]">{attendee.role}</p>
                  </div>
                </div>
                <Badge tone={attendee.responseStatus === "ACCEPTED" ? "green" : "gray"}>{attendee.responseStatus}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-[#0B1220]">Action Items</h3>
          <div className="mt-3 space-y-2">
            {(meeting.actionItems ?? []).length ? (meeting.actionItems ?? []).map((item) => (
              <div key={item.id} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1E293B]">{item.title}</p>
                    <p className="text-xs text-[#64748B]">{item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}` : "Unassigned"}{item.dueDate ? ` • Due ${formatDate(item.dueDate)}` : ""}</p>
                  </div>
                  <Badge tone={item.status === "CONVERTED_TO_TASK" ? "green" : "gold"}>{item.status}</Badge>
                </div>
                {canManage && item.status !== "CONVERTED_TO_TASK" ? (
                  <Button type="button" className="mt-3 h-8 bg-[#10B981] px-3 hover:bg-emerald-600" disabled={convertPending} onClick={() => onConvertActionItem(item.id)}>
                    <CheckCircle2 className="h-4 w-4" /> Convert to task
                  </Button>
                ) : null}
              </div>
            )) : <p className="rounded-md border border-dashed border-[#CBD5E1] p-3 text-sm text-[#64748B]">No action items yet.</p>}
          </div>
          {canCreateActionItems ? (
            <form className="mt-4 space-y-3 rounded-lg border border-[#E2E8F0] bg-white p-4" onSubmit={(event) => submit(event, () => {
              onCreateActionItem(form);
              setForm(defaultActionItemForm);
            })}>
              <Input placeholder="Action item title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
              <Textarea placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={form.assignedToId} onChange={(event) => setForm({ ...form, assignedToId: event.target.value })}>
                  <option value="">Unassigned</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}
                </Select>
                <Input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
              </div>
              <Button type="submit" disabled={actionPending || !form.title.trim()}>Add action item</Button>
            </form>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}

function MeetingDialog({ open, title, meeting, members, workspaces, projects, pending, onClose, onSubmit }: { open: boolean; title: string; meeting?: Meeting; members: User[]; workspaces: Workspace[]; projects: Project[]; pending: boolean; onClose: () => void; onSubmit: (form: MeetingForm) => void }) {
  const [form, setForm] = useState<MeetingForm>(defaultMeetingForm);

  useEffect(() => {
    if (open) {
      setForm(meeting ? formFromMeeting(meeting) : defaultMeetingForm);
    }
  }, [meeting, open]);

  return (
    <Dialog open={open} title={title} description="Schedule a shared portal meeting with agenda, notes, and invited members." onClose={onClose}>
      <form className="max-h-[75vh] space-y-4 overflow-y-auto pr-1" onSubmit={(event) => submit(event, () => onSubmit(form))}>
        <Field label="Title"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></Field>
        <Field label="Description"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Workspace"><Select value={form.workspaceId} onChange={(event) => setForm({ ...form, workspaceId: event.target.value })}><option value="">Organization-wide</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</Select></Field>
          <Field label="Project"><Select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</Select></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Start"><Input type="datetime-local" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required /></Field>
          <Field label="End"><Input type="datetime-local" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Location"><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
          <Field label="Video URL"><Input value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} /></Field>
        </div>
        <Field label="Status"><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as MeetingStatus })}><option value="SCHEDULED">Scheduled</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></Select></Field>
        <Field label="Agenda"><Textarea value={form.agenda} onChange={(event) => setForm({ ...form, agenda: event.target.value })} /></Field>
        <Field label="Notes"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
        <Field label="Invite members"><Select multiple value={form.attendeeIds} onChange={(event) => setForm({ ...form, attendeeIds: Array.from(event.target.selectedOptions).map((option) => option.value) })} className="min-h-28">{members.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}</Select></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" className="bg-white text-[#1E293B] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>{meeting ? "Save changes" : "Create meeting"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteDialog({ open, meeting, pending, onClose, onConfirm }: { open: boolean; meeting?: Meeting; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} title="Delete meeting" description="This removes the meeting, attendees, notes, and action items." onClose={onClose}>
      <p className="text-sm text-[#64748B]">Delete <span className="font-semibold text-[#0B1220]">{meeting?.title}</span>?</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" className="bg-white text-[#1E293B] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]" onClick={onClose}>Cancel</Button>
        <Button type="button" className="bg-red-600 hover:bg-red-700" disabled={pending} onClick={onConfirm}>Delete meeting</Button>
      </div>
    </Dialog>
  );
}

function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  if (status === "COMPLETED") return <Badge tone="green">Completed</Badge>;
  if (status === "CANCELLED") return <Badge tone="red">Cancelled</Badge>;
  return <Badge tone="blue">Scheduled</Badge>;
}

function InfoSection({ title, value, empty }: { title: string; value?: string; empty: string }) {
  return (
    <div>
      <h3 className="font-semibold text-[#0B1220]">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm leading-6 text-[#64748B]">{value || empty}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <Label><span className="mb-1 block">{label}</span>{children}</Label>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <Card className="p-10 text-center"><h3 className="text-lg font-semibold text-[#0B1220]">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm text-[#64748B]">{description}</p></Card>;
}

function MeetingSkeleton() {
  return <div className="grid gap-4 xl:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-40 animate-pulse rounded-lg bg-white" />)}</div>;
}

function meetingPayload(form: MeetingForm, workspaces: Workspace[], projects: Project[]) {
  const project = projects.find((item) => item.id === form.projectId);
  const workspace = workspaces.find((item) => item.id === (form.workspaceId || project?.workspaceId));
  return {
    organizationId: project?.organizationId ?? workspace?.organizationId ?? workspaces[0]?.organizationId ?? projects[0]?.organizationId,
    workspaceId: form.workspaceId || project?.workspaceId || undefined,
    projectId: form.projectId || undefined,
    title: form.title,
    description: form.description || undefined,
    location: form.location || undefined,
    videoUrl: form.videoUrl || undefined,
    startTime: new Date(form.startTime).toISOString(),
    endTime: new Date(form.endTime).toISOString(),
    status: form.status,
    agenda: form.agenda || undefined,
    notes: form.notes || undefined,
    attendees: form.attendeeIds.map((userId) => ({ userId, role: "REQUIRED", responseStatus: "PENDING" }))
  };
}

function actionItemPayload(form: ActionItemForm) {
  return {
    title: form.title,
    description: form.description || undefined,
    assignedToId: form.assignedToId || undefined,
    dueDate: form.dueDate || undefined
  };
}

function formFromMeeting(meeting: Meeting): MeetingForm {
  return {
    title: meeting.title,
    description: meeting.description ?? "",
    workspaceId: meeting.workspaceId ?? "",
    projectId: meeting.projectId ?? "",
    location: meeting.location ?? "",
    videoUrl: meeting.videoUrl ?? "",
    startTime: toDateTimeLocal(meeting.startTime),
    endTime: toDateTimeLocal(meeting.endTime),
    status: meeting.status,
    agenda: meeting.agenda ?? "",
    notes: meeting.notes ?? "",
    attendeeIds: (meeting.attendees ?? []).map((attendee) => attendee.userId)
  };
}

function submit(event: FormEvent, callback: () => void) {
  event.preventDefault();
  callback();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function calendarDays(month: Date) {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}
