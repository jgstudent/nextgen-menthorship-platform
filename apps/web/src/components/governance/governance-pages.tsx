"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, FileLock2, FileSignature, Landmark, Plus, ScrollText, Search, ShieldCheck, Video } from "lucide-react";
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
import type { Approval, BoardResolution, DocumentRecord, FileAttachment, Meeting, Policy, Program, ResolutionStatus, UserRole } from "@/types/domain";

type GovernanceSummary = {
  workspace: { id: string; name: string; description?: string };
  programs: Program[];
  metrics: {
    governancePrograms: number;
    pendingApprovals: number;
    upcomingBoardMeetings: number;
    policiesUnderReview: number;
    resolutionsAwaitingApproval: number;
    restrictedSignaturesPending: number;
  };
  pendingApprovals: Approval[];
  upcomingMeetings: Meeting[];
  policiesUnderReview: Policy[];
  resolutionsAwaitingApproval: BoardResolution[];
  restrictedSignaturesPending: DocumentRecord[];
  recentAuditActivity: Array<{ id: string; action: string; entityType: string; timestamp: string; actor?: { firstName: string; lastName: string } }>;
};

const links = [
  { href: "/governance/meetings", label: "Meetings", icon: Video },
  { href: "/governance/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/governance/files", label: "Files", icon: FileLock2 },
  { href: "/governance/policies", label: "Policies", icon: ShieldCheck },
  { href: "/governance/resolutions", label: "Resolutions", icon: ScrollText },
  { href: "/governance/signatures", label: "Signatures", icon: FileSignature }
];

export function GovernanceOverview() {
  const { data, isLoading } = useQuery({ queryKey: ["governance", "summary"], queryFn: () => api<GovernanceSummary>("/governance/summary") });

  return (
    <GovernanceGuard>
      <PageHeader title="Executive Governance" description="Board-level operations, restricted approvals, policies, resolutions, confidential files, and signatures." />
      <div className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Programs" value={data?.metrics.governancePrograms ?? 0} loading={isLoading} />
        <Metric label="Pending Approvals" value={data?.metrics.pendingApprovals ?? 0} loading={isLoading} />
        <Metric label="Board Meetings" value={data?.metrics.upcomingBoardMeetings ?? 0} loading={isLoading} />
        <Metric label="Policies Review" value={data?.metrics.policiesUnderReview ?? 0} loading={isLoading} />
        <Metric label="Resolutions" value={data?.metrics.resolutionsAwaitingApproval ?? 0} loading={isLoading} />
        <Metric label="Signatures" value={data?.metrics.restrictedSignaturesPending ?? 0} loading={isLoading} />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-[#1D4ED8]">
              <Icon className="mb-4 h-5 w-5 text-[#1D4ED8]" />
              <h3 className="font-semibold text-[#0B1220]">{item.label}</h3>
              <p className="mt-1 text-sm text-[#64748B]">Restricted governance records and executive-only review activity.</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ActivityCard title="Upcoming Board Meetings" items={(data?.upcomingMeetings ?? []).map((meeting) => ({ id: meeting.id, title: meeting.title, meta: new Date(meeting.startTime).toLocaleString(), badge: meeting.status }))} />
        <ActivityCard title="Pending Governance Approvals" items={(data?.pendingApprovals ?? []).map((approval) => ({ id: approval.id, title: approval.title, meta: approval.type, badge: approval.status }))} />
        <ActivityCard title="Policies Under Review" items={(data?.policiesUnderReview ?? []).map((policy) => ({ id: policy.id, title: policy.title, meta: `Version ${policy.version}`, badge: policy.status }))} />
        <ActivityCard title="Recent Governance Audit" items={(data?.recentAuditActivity ?? []).map((event) => ({ id: event.id, title: formatLabel(event.action), meta: `${event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : "System"} - ${new Date(event.timestamp).toLocaleString()}`, badge: event.entityType }))} />
      </div>
    </GovernanceGuard>
  );
}

export function GovernanceMeetings() {
  const { data, isLoading } = useQuery({ queryKey: ["governance", "meetings"], queryFn: () => api<Meeting[]>("/governance/meetings") });
  return (
    <GovernanceList title="Governance Meetings" description="Executive-only board meetings, agendas, notes, action items, and linked records." loading={isLoading} searchFields={["title", "status"]} items={data ?? []}>
      {(meeting) => (
        <Row key={meeting.id} title={meeting.title} meta={new Date(meeting.startTime).toLocaleString()} badge={meeting.status} detail={`${meeting.attendees?.length ?? 0} attendee(s) - ${meeting.actionItems?.length ?? 0} action item(s)`} />
      )}
    </GovernanceList>
  );
}

export function GovernanceApprovals() {
  const { data, isLoading } = useQuery({ queryKey: ["governance", "approvals"], queryFn: () => api<Approval[]>("/governance/approvals") });
  return (
    <GovernanceList title="Governance Approvals" description="Policy, budget, resolution, confidential file, and restricted signing approvals." loading={isLoading} searchFields={["title", "type", "status"]} items={data ?? []}>
      {(approval) => <Row key={approval.id} title={approval.title} meta={formatLabel(approval.type)} badge={approval.status} detail={approval.assignedApprover ? `Approver: ${approval.assignedApprover.firstName} ${approval.assignedApprover.lastName}` : "Unassigned"} />}
    </GovernanceList>
  );
}

export function GovernanceFiles() {
  const { data, isLoading } = useQuery({ queryKey: ["governance", "files"], queryFn: () => api<FileAttachment[]>("/governance/files") });
  return (
    <GovernanceList title="Confidential Files" description="Executive-only files linked to governance documents, policies, approvals, and records." loading={isLoading} searchFields={["originalName", "mimeType"]} items={data ?? []}>
      {(file) => <Row key={file.id} title={file.originalName} meta={file.mimeType} badge={formatBytes(file.size)} detail={file.uploadedBy ? `Uploaded by ${file.uploadedBy.firstName} ${file.uploadedBy.lastName}` : "Confidential file"} />}
    </GovernanceList>
  );
}

export function GovernancePolicies() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["governance", "policies"], queryFn: () => api<Policy[]>("/governance/policies") });
  const createPolicy = useMutation({
    mutationFn: (payload: { title: string; description: string; status: string; version: string }) => api<Policy>("/governance/policies", { method: "POST", body: JSON.stringify({ ...payload, description: payload.description || undefined }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance", "policies"] });
      queryClient.invalidateQueries({ queryKey: ["governance", "summary"] });
      setOpen(false);
    }
  });

  return (
    <>
      <GovernanceList title="Policy Management" description="Draft, review, approve, and archive governance policies." loading={isLoading} searchFields={["title", "status", "version"]} items={data ?? []} actions={<Button type="button" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Policy</Button>}>
        {(policy) => <Row key={policy.id} title={policy.title} meta={`Version ${policy.version}`} badge={policy.status} detail={policy.description ?? "No description"} />}
      </GovernanceList>
      <Dialog open={open} title="New Policy" description="Create an executive governance policy draft." onClose={() => setOpen(false)}>
        <PolicyForm saving={createPolicy.isPending} onSubmit={(payload) => createPolicy.mutate(payload)} />
      </Dialog>
    </>
  );
}

export function GovernanceResolutions() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["governance", "resolutions"], queryFn: () => api<BoardResolution[]>("/governance/resolutions") });
  const createResolution = useMutation({
    mutationFn: (payload: { title: string; description: string; status: ResolutionStatus; resolutionNumber: string }) => api<BoardResolution>("/governance/resolutions", { method: "POST", body: JSON.stringify({ ...payload, description: payload.description || undefined, resolutionNumber: payload.resolutionNumber || undefined }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance", "resolutions"] });
      queryClient.invalidateQueries({ queryKey: ["governance", "summary"] });
      setOpen(false);
    }
  });

  return (
    <>
      <GovernanceList title="Board Resolutions" description="Formal board resolutions with approval, document, and meeting links." loading={isLoading} searchFields={["title", "status", "resolutionNumber"]} items={data ?? []} actions={<Button type="button" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Resolution</Button>}>
        {(resolution) => <Row key={resolution.id} title={resolution.title} meta={resolution.resolutionNumber ?? "No resolution number"} badge={resolution.status} detail={resolution.description ?? "No description"} />}
      </GovernanceList>
      <Dialog open={open} title="New Resolution" description="Create a board resolution draft." onClose={() => setOpen(false)}>
        <ResolutionForm saving={createResolution.isPending} onSubmit={(payload) => createResolution.mutate(payload)} />
      </Dialog>
    </>
  );
}

export function GovernanceSignatures() {
  const { data, isLoading } = useQuery({ queryKey: ["governance", "documents"], queryFn: () => api<DocumentRecord[]>("/governance/documents") });
  return (
    <GovernanceList title="Restricted Signatures" description="Approval-gated governance documents prepared for DocuSeal signing." loading={isLoading} searchFields={["title", "status"]} items={data ?? []}>
      {(document) => <Row key={document.id} title={document.title} meta={document.approval ? `Approval: ${formatLabel(document.approval.status)}` : "No approval linked"} badge={document.status} detail={`${document.submissions?.length ?? 0} submission(s) - Sponsor visible: ${document.sponsorVisible ? "Yes" : "No"}`} />}
    </GovernanceList>
  );
}

function GovernanceGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!isGovernanceRole(user?.role)) {
    return (
      <Card className="p-8 text-center">
        <Landmark className="mx-auto mb-3 h-8 w-8 text-[#64748B]" />
        <h1 className="text-xl font-bold text-[#0B1220]">Executive Governance is restricted</h1>
        <p className="mt-2 text-sm text-[#64748B]">Only Super Admin and Executive users can access this workspace area.</p>
      </Card>
    );
  }
  return <>{children}</>;
}

function GovernanceList<T extends object>({ title, description, loading, items, searchFields, actions, children }: { title: string; description: string; loading: boolean; items: T[]; searchFields: string[]; actions?: ReactNode; children: (item: T) => ReactNode }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => items.filter((item) => searchFields.some((field) => String(item[field as keyof T] ?? "").toLowerCase().includes(search.toLowerCase()))), [items, search, searchFields]);

  return (
    <GovernanceGuard>
      <PageHeader title={title} description={description} actions={actions} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative block flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="pl-9" />
        </label>
      </div>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1fr_180px_180px] bg-[#0B1220] px-4 py-3 text-xs font-semibold uppercase text-white">
          <span>Record</span><span>Status</span><span>Detail</span>
        </div>
        {loading ? <EmptyState text="Loading governance records..." /> : filtered.length ? filtered.map(children) : <EmptyState text="No governance records match the current filters." />}
      </Card>
    </GovernanceGuard>
  );
}

function Row({ title, meta, badge, detail }: { title: string; meta: string; badge: string; detail: string }) {
  return (
    <div className="grid grid-cols-[1fr_180px_180px] items-center border-t border-[#E2E8F0] px-4 py-3 text-sm">
      <div>
        <p className="font-semibold text-[#0B1220]">{title}</p>
        <p className="mt-1 text-xs text-[#64748B]">{meta}</p>
      </div>
      <Badge tone={badgeTone(badge)}>{formatLabel(badge)}</Badge>
      <p className="text-xs text-[#64748B]">{detail}</p>
    </div>
  );
}

function Metric({ label, value, loading }: { label: string; value: number; loading?: boolean }) {
  return <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><p className="mt-2 text-2xl font-bold text-[#0B1220]">{loading ? "..." : value}</p></Card>;
}

function ActivityCard({ title, items }: { title: string; items: Array<{ id: string; title: string; meta: string; badge: string }> }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-[#0B1220]">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-[#F8FAFC] p-3"><div><p className="text-sm font-medium text-[#0B1220]">{item.title}</p><p className="text-xs text-[#64748B]">{item.meta}</p></div><Badge tone={badgeTone(item.badge)}>{formatLabel(item.badge)}</Badge></div>) : <p className="rounded-md border border-dashed border-[#CBD5E1] p-4 text-sm text-[#64748B]">No current items.</p>}
      </div>
    </Card>
  );
}

function PolicyForm({ saving, onSubmit }: { saving: boolean; onSubmit: (payload: { title: string; description: string; status: string; version: string }) => void }) {
  const [form, setForm] = useState({ title: "", description: "", status: "DRAFT", version: "1.0" });
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }
  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Policy title" required />
      <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="DRAFT">Draft</option><option value="UNDER_REVIEW">Under Review</option><option value="APPROVED">Approved</option><option value="ARCHIVED">Archived</option></Select>
        <Input value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} placeholder="Version" />
      </div>
      <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Policy"}</Button>
    </form>
  );
}

function ResolutionForm({ saving, onSubmit }: { saving: boolean; onSubmit: (payload: { title: string; description: string; status: ResolutionStatus; resolutionNumber: string }) => void }) {
  const [form, setForm] = useState<{ title: string; description: string; status: ResolutionStatus; resolutionNumber: string }>({ title: "", description: "", status: "DRAFT", resolutionNumber: "" });
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }
  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Resolution title" required />
      <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ResolutionStatus })}><option value="DRAFT">Draft</option><option value="UNDER_REVIEW">Under Review</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ARCHIVED">Archived</option></Select>
        <Input value={form.resolutionNumber} onChange={(event) => setForm({ ...form, resolutionNumber: event.target.value })} placeholder="Resolution number" />
      </div>
      <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Resolution"}</Button>
    </form>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="border-t border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">{text}</div>;
}

function badgeTone(value: string): "green" | "red" | "gold" | "blue" | "gray" {
  if (["APPROVED", "COMPLETED", "ACTIVE", "SIGNED"].includes(value)) return "green";
  if (["REJECTED", "CANCELLED", "VOIDED", "DECLINED"].includes(value)) return "red";
  if (["UNDER_REVIEW", "CHANGES_REQUESTED", "HIGH", "CRITICAL"].includes(value)) return "gold";
  if (["PENDING_REVIEW", "IN_REVIEW", "SCHEDULED", "SENT_FOR_SIGNATURE", "READY_FOR_SIGNATURE"].includes(value)) return "blue";
  return "gray";
}

function formatLabel(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isGovernanceRole(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE";
}
