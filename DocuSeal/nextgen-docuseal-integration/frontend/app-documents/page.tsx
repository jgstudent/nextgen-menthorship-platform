"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, Plus, Search, Send } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { DocumentPanel, DocumentStatusBadge, formatLabel } from "@/components/documents/document-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { canCreateDocuments, canSendDocuments } from "@/lib/permissions";
import type { DocumentRecord, DocumentStatus, Workspace } from "@/types/domain";

const statuses: Array<DocumentStatus | "ALL"> = ["ALL", "DRAFT", "APPROVAL_REQUIRED", "READY_FOR_SIGNATURE", "SENT_FOR_SIGNATURE", "PARTIALLY_SIGNED", "COMPLETED", "VOIDED", "DECLINED"];

type DocumentForm = {
  title: string;
  description: string;
  workspaceId: string;
  docusealTemplateId: string;
  sponsorVisible: boolean;
};

type SendForm = {
  name: string;
  email: string;
  role: string;
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<DocumentRecord | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["documents"], queryFn: () => api<DocumentRecord[]>("/documents") });
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: () => api<Workspace[]>("/workspaces"), enabled: canCreateDocuments(user?.role) });

  const createDocument = useMutation({
    mutationFn: (payload: DocumentForm) => api<DocumentRecord>("/documents", { method: "POST", body: JSON.stringify({ ...payload, description: payload.description || undefined, docusealTemplateId: payload.docusealTemplateId || undefined }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setCreateOpen(false);
      toast({ title: "Document created", description: "The signing record is ready.", tone: "success" });
    },
    onError: () => {
      toast({ title: "Unable to create document", description: "Please check the form and try again.", tone: "error" });
    }
  });

  const sendDocument = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SendForm }) => api<DocumentRecord>(`/documents/${id}/send-for-signature`, { method: "POST", body: JSON.stringify({ signers: [{ ...payload, role: payload.role || undefined }] }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSendTarget(null);
      toast({ title: "Document sent", description: "The signature submission was created.", tone: "success" });
    },
    onError: () => {
      toast({ title: "Unable to send document", description: "The approval gate or DocuSeal request blocked this action.", tone: "error" });
    }
  });

  const documents = useMemo(() => (data ?? []).filter((document) => {
    const text = `${document.title} ${document.description ?? ""} ${document.status} ${document.workspace?.name ?? ""}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (statusFilter === "ALL" || document.status === statusFilter);
  }), [data, search, statusFilter]);

  const awaitingSignatures = documents.filter((document) => ["SENT_FOR_SIGNATURE", "PARTIALLY_SIGNED"].includes(document.status));
  const approvalBlocked = documents.filter((document) => document.status === "APPROVAL_REQUIRED");

  return (
    <>
      <PageHeader
        title="Documents"
        description="Governed document signing with approval-gated DocuSeal submissions."
        actions={canCreateDocuments(user?.role) ? <Button type="button" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Document</Button> : null}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Metric label="Documents" value={documents.length} />
        <Metric label="Awaiting Signatures" value={awaitingSignatures.length} />
        <Metric label="Needs Approval" value={approvalBlocked.length} />
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="relative block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents" className="pl-9" />
        </label>
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DocumentStatus | "ALL")}>
          {statuses.map((status) => <option key={status} value={status}>{status === "ALL" ? "All statuses" : formatLabel(status)}</option>)}
        </Select>
      </div>

      {error ? <EmptyState text="Unable to load documents." /> : isLoading ? <EmptyState text="Loading documents..." /> : documents.length ? (
        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white shadow-soft">
          <div className="grid min-w-[980px] grid-cols-[1.5fr_0.8fr_1fr_1fr_170px] bg-[#0B1220] px-4 py-3 text-xs font-semibold uppercase text-white">
            <span>Document</span><span>Status</span><span>Scope</span><span>Signers</span><span>Action</span>
          </div>
          {documents.map((document) => (
            <div key={document.id} className="grid min-w-[980px] grid-cols-[1.5fr_0.8fr_1fr_1fr_170px] items-center border-t border-[#E2E8F0] px-4 py-3 text-sm">
              <span><span className="block font-semibold text-[#0B1220]">{document.title}</span><span className="text-[#64748B]">{document.description || "No description"}</span></span>
              <span><DocumentStatusBadge status={document.status} /></span>
              <span className="text-[#64748B]">{document.program?.name ?? document.project?.name ?? document.workspace?.name ?? "Organization"}</span>
              <span className="flex flex-wrap gap-1">{(document.submissions?.[0]?.signers ?? []).length ? <Badge tone="blue">{document.submissions?.[0]?.signers?.length} signer(s)</Badge> : <span className="text-[#64748B]">No submissions</span>}</span>
              <span className="flex gap-2">
                {canSendDocuments(user?.role) ? <Button type="button" className="h-9" onClick={() => setSendTarget(document)}><Send className="h-4 w-4" /> Send</Button> : null}
              </span>
            </div>
          ))}
        </div>
      ) : <DocumentPanel documents={[]} emptyText="No documents match the current filters." />}

      <Dialog open={createOpen} title="New Document" description="Create a governed signing record." onClose={() => setCreateOpen(false)}>
        <DocumentFormView workspaces={workspaces ?? []} saving={createDocument.isPending} onSubmit={(payload) => createDocument.mutate(payload)} />
      </Dialog>

      <Dialog open={Boolean(sendTarget)} title="Send for Signature" description={sendTarget?.title} onClose={() => setSendTarget(null)}>
        {sendTarget?.approvalId && sendTarget.approval?.status !== "APPROVED" ? (
          <Card className="border-[#D4A017]/40 bg-[#FFFBEB] p-4">
            <p className="font-semibold text-[#0B1220]">Approval required before signing</p>
            <p className="mt-1 text-sm text-[#64748B]">This document is linked to an approval that is still {formatLabel(sendTarget.approval?.status ?? "PENDING_REVIEW")}.</p>
          </Card>
        ) : sendTarget ? (
          <SendFormView saving={sendDocument.isPending} error={sendDocument.error ? "Unable to send document." : undefined} onSubmit={(payload) => sendDocument.mutate({ id: sendTarget.id, payload })} />
        ) : null}
      </Dialog>
    </>
  );
}

function DocumentFormView({ workspaces, saving, onSubmit }: { workspaces: Workspace[]; saving: boolean; onSubmit: (form: DocumentForm) => void }) {
  const [form, setForm] = useState<DocumentForm>({ title: "", description: "", workspaceId: workspaces[0]?.id ?? "", docusealTemplateId: "", sponsorVisible: false });

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Document title" required />
      <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" />
      <Select value={form.workspaceId} onChange={(event) => setForm({ ...form, workspaceId: event.target.value })} required>
        <option value="">Select workspace</option>
        {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
      </Select>
      <Input value={form.docusealTemplateId} onChange={(event) => setForm({ ...form, docusealTemplateId: event.target.value })} placeholder="DocuSeal template ID (optional)" />
      <label className="flex items-center gap-2 text-sm font-medium text-[#1E293B]">
        <input type="checkbox" checked={form.sponsorVisible} onChange={(event) => setForm({ ...form, sponsorVisible: event.target.checked })} />
        Sponsor-visible after completion
      </label>
      <Button type="submit" disabled={saving || !form.workspaceId}>{saving ? "Creating..." : "Create Document"}</Button>
    </form>
  );
}

function SendFormView({ saving, error, onSubmit }: { saving: boolean; error?: string; onSubmit: (form: SendForm) => void }) {
  const [form, setForm] = useState<SendForm>({ name: "", email: "", role: "Signer" });

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Signer name" required />
      <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Signer email" required />
      <Input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="Signer role" />
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      <Button type="submit" disabled={saving}>{saving ? "Sending..." : "Send for Signature"}</Button>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><p className="mt-2 text-2xl font-bold text-[#0B1220]">{value}</p></Card>;
}

function EmptyState({ text }: { text: string }) {
  return <Card className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center"><FileSignature className="h-9 w-9 text-[#64748B]" /><p className="font-semibold text-[#0B1220]">{text}</p></Card>;
}
