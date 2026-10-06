"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, Search } from "lucide-react";
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
import { canCreateApprovals, canReviewApprovals, roleLabel } from "@/lib/permissions";
import type { Approval, ApprovalPriority, ApprovalStatus, ApprovalType, Workspace } from "@/types/domain";

const statuses: ApprovalStatus[] = ["DRAFT", "PENDING_REVIEW", "IN_REVIEW", "APPROVED", "REJECTED", "CHANGES_REQUESTED", "CANCELLED"];
const types: ApprovalType[] = ["PROGRAM_APPROVAL", "PROJECT_APPROVAL", "TASK_APPROVAL", "FILE_APPROVAL", "BENEFICIARY_APPROVAL", "WORKSHOP_APPROVAL", "SPONSOR_VISIBILITY_APPROVAL", "BUDGET_APPROVAL", "GENERAL_REQUEST"];
const priorities: ApprovalPriority[] = ["LOW", "NORMAL", "HIGH", "CRITICAL"];

type ApprovalForm = {
  title: string;
  description: string;
  type: ApprovalType;
  priority: ApprovalPriority;
  workspaceId: string;
  dueDate: string;
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [selected, setSelected] = useState<Approval | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["approvals"], queryFn: () => api<Approval[]>("/approvals") });
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: () => api<Workspace[]>("/workspaces"), enabled: canCreateApprovals(user?.role) });

  const createApproval = useMutation({
    mutationFn: (payload: ApprovalForm) => api<Approval>("/approvals", { method: "POST", body: JSON.stringify({ ...payload, description: payload.description || undefined, dueDate: payload.dueDate || undefined }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      setFormOpen(false);
    }
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "submit" | "approve" | "reject" | "request-changes" | "cancel" | "reopen" }) => api<Approval>(`/approvals/${id}/${action}`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: (approval) => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      setSelected(approval);
    }
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => api(`/approvals/${id}/comments`, { method: "POST", body: JSON.stringify({ content }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      setComment("");
    }
  });

  const approvals = useMemo(() => (data ?? []).filter((approval) => {
    const text = `${approval.title} ${approval.description ?? ""} ${approval.type} ${approval.status} ${approval.priority}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (statusFilter === "ALL" || approval.status === statusFilter) && (typeFilter === "ALL" || approval.type === typeFilter) && (priorityFilter === "ALL" || approval.priority === priorityFilter);
  }), [data, priorityFilter, search, statusFilter, typeFilter]);

  const assigned = approvals.filter((approval) => approval.assignedApproverId === user?.id);
  const awaitingReview = approvals.filter((approval) => ["PENDING_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED"].includes(approval.status));
  const overdue = approvals.filter((approval) => approval.dueDate && new Date(approval.dueDate) < new Date() && ["PENDING_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED"].includes(approval.status));

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Governance review, operational accountability, and approval history."
        actions={canCreateApprovals(user?.role) ? <Button type="button" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Approval</Button> : null}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Metric label="Assigned to Me" value={assigned.length} />
        <Metric label="Awaiting Review" value={awaitingReview.length} />
        <Metric label="Overdue" value={overdue.length} />
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_190px_230px_180px]">
        <label className="relative block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search approvals" className="pl-9" />
        </label>
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">All statuses</option>
          {statuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
        </Select>
        <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="ALL">All types</option>
          {types.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}
        </Select>
        <Select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
          <option value="ALL">All priorities</option>
          {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
        </Select>
      </div>

      {isLoading ? <EmptyState text="Loading approvals..." /> : approvals.length ? (
        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white shadow-soft">
          <div className="grid min-w-[1040px] grid-cols-[1.4fr_1fr_0.8fr_0.9fr_1fr_160px] bg-[#0B1220] px-4 py-3 text-xs font-semibold uppercase text-white">
            <span>Request</span><span>Type</span><span>Status</span><span>Priority</span><span>Owner</span><span>Due</span>
          </div>
          {approvals.map((approval) => (
            <button key={approval.id} type="button" onClick={() => setSelected(approval)} className="grid min-w-[1040px] grid-cols-[1.4fr_1fr_0.8fr_0.9fr_1fr_160px] items-center border-t border-[#E2E8F0] px-4 py-3 text-left text-sm transition hover:bg-[#F8FAFC]">
              <span><span className="block font-semibold text-[#0B1220]">{approval.title}</span><span className="text-[#64748B]">{approval.workspace?.name}</span></span>
              <span className="text-[#64748B]">{formatLabel(approval.type)}</span>
              <span><StatusBadge status={approval.status} /></span>
              <span><PriorityBadge priority={approval.priority} /></span>
              <span className="text-[#64748B]">{approval.assignedApprover ? `${approval.assignedApprover.firstName} ${approval.assignedApprover.lastName}` : approval.requestedBy ? `${approval.requestedBy.firstName} ${approval.requestedBy.lastName}` : "Unassigned"}</span>
              <span className="text-[#64748B]">{approval.dueDate ? new Date(approval.dueDate).toLocaleDateString() : "No date"}</span>
            </button>
          ))}
        </div>
      ) : <EmptyState text="No approvals match the current filters." />}

      <Dialog open={Boolean(selected)} title="Approval Review" description={selected?.title} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selected.status} />
              <PriorityBadge priority={selected.priority} />
              <Badge tone="blue">{formatLabel(selected.type)}</Badge>
            </div>
            <p className="text-sm leading-6 text-[#64748B]">{selected.description || "No description provided."}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Requested by" value={selected.requestedBy ? `${selected.requestedBy.firstName} ${selected.requestedBy.lastName}` : "Unknown"} />
              <Detail label="Approver" value={selected.assignedApprover ? `${selected.assignedApprover.firstName} ${selected.assignedApprover.lastName}` : "Unassigned"} />
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.status === "DRAFT" ? <Button type="button" onClick={() => actionMutation.mutate({ id: selected.id, action: "submit" })}>Submit</Button> : null}
              {canReviewApprovals(user?.role) ? (
                <>
                  <Button type="button" onClick={() => actionMutation.mutate({ id: selected.id, action: "approve" })}>Approve</Button>
                  <Button type="button" className="bg-[#D4A017] hover:bg-[#B88910]" onClick={() => actionMutation.mutate({ id: selected.id, action: "request-changes" })}>Request Changes</Button>
                  <Button type="button" className="bg-red-600 hover:bg-red-700" onClick={() => actionMutation.mutate({ id: selected.id, action: "reject" })}>Reject</Button>
                </>
              ) : null}
              <Button type="button" className="bg-white text-[#1E293B] ring-1 ring-[#CBD5E1] hover:bg-[#F8FAFC]" onClick={() => actionMutation.mutate({ id: selected.id, action: "cancel" })}>Cancel</Button>
            </div>
            <section>
              <h3 className="mb-3 font-semibold text-[#0B1220]">Comments</h3>
              <div className="space-y-2">
                {(selected.comments ?? []).map((item) => <div key={item.id} className="rounded-md bg-[#F8FAFC] p-3 text-sm"><p className="font-medium text-[#0B1220]">{item.author ? `${item.author.firstName} ${item.author.lastName}` : "Reviewer"}</p><p className="text-[#64748B]">{item.content}</p></div>)}
              </div>
              <div className="mt-3 flex gap-2">
                <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a review comment" />
                <Button type="button" disabled={!comment.trim()} onClick={() => commentMutation.mutate({ id: selected.id, content: comment })}><MessageSquare className="h-4 w-4" /> Comment</Button>
              </div>
            </section>
            <section>
              <h3 className="mb-3 font-semibold text-[#0B1220]">Timeline</h3>
              <div className="space-y-2">
                {(selected.history ?? []).map((event) => <div key={event.id} className="rounded-md border border-[#E2E8F0] p-3 text-sm"><p className="font-medium text-[#0B1220]">{formatLabel(event.action)} {event.newStatus ? `to ${formatLabel(event.newStatus)}` : ""}</p><p className="text-[#64748B]">{event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : "System"} • {new Date(event.timestamp).toLocaleString()}</p></div>)}
              </div>
            </section>
          </div>
        ) : null}
      </Dialog>

      <Dialog open={formOpen} title="New Approval" description="Create a governance review request." onClose={() => setFormOpen(false)}>
        <ApprovalFormView workspaces={workspaces ?? []} saving={createApproval.isPending} onSubmit={(payload) => createApproval.mutate(payload)} />
      </Dialog>
    </>
  );
}

function ApprovalFormView({ workspaces, saving, onSubmit }: { workspaces: Workspace[]; saving: boolean; onSubmit: (form: ApprovalForm) => void }) {
  const [form, setForm] = useState<ApprovalForm>({ title: "", description: "", type: "GENERAL_REQUEST", priority: "NORMAL", workspaceId: workspaces[0]?.id ?? "", dueDate: "" });

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Approval title" required />
      <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ApprovalType })}>{types.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}</Select>
        <Select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as ApprovalPriority })}>{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</Select>
      </div>
      <Select value={form.workspaceId} onChange={(event) => setForm({ ...form, workspaceId: event.target.value })} required>
        <option value="">Select workspace</option>
        {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
      </Select>
      <Input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
      <Button type="submit" disabled={saving || !form.workspaceId}>{saving ? "Creating..." : "Create Approval"}</Button>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><p className="mt-2 text-2xl font-bold text-[#0B1220]">{value}</p></Card>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-[#F8FAFC] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><p className="mt-1 text-sm font-medium text-[#0B1220]">{value}</p></div>;
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const tone = status === "APPROVED" ? "green" : status === "REJECTED" || status === "CANCELLED" ? "red" : status === "CHANGES_REQUESTED" ? "gold" : "blue";
  return <Badge tone={tone}>{formatLabel(status)}</Badge>;
}

function PriorityBadge({ priority }: { priority: ApprovalPriority }) {
  const tone = priority === "CRITICAL" ? "red" : priority === "HIGH" ? "gold" : priority === "NORMAL" ? "blue" : "gray";
  return <Badge tone={tone}>{priority}</Badge>;
}

function EmptyState({ text }: { text: string }) {
  return <Card className="border-dashed p-8 text-center text-sm text-[#64748B]">{text}</Card>;
}

function formatLabel(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
