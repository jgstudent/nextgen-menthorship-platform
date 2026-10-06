"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileSignature, ShieldCheck } from "lucide-react";
import { DocumentPanel, DocumentStatusBadge, SignerStatusBadge, formatLabel } from "@/components/documents/document-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { DocumentRecord } from "@/types/domain";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: document, isLoading, error } = useQuery({ queryKey: ["documents", params.id], queryFn: () => api<DocumentRecord>(`/documents/${params.id}`) });

  if (isLoading) {
    return <Card className="p-8 text-center font-semibold text-[#0B1220]">Loading document...</Card>;
  }

  if (error || !document) {
    return <Card className="p-8 text-center font-semibold text-red-600">Unable to load this document.</Card>;
  }

  const latestSubmission = document.submissions?.[0];
  const signingUrl = latestSubmission?.signers?.find((signer) => signer.embeddedUrl || signer.signingUrl)?.embeddedUrl ?? latestSubmission?.signers?.find((signer) => signer.signingUrl)?.signingUrl;

  return (
    <>
      <PageHeader
        title={document.title}
        description={document.description || "Document signing record and audit trail."}
        actions={<DocumentStatusBadge status={document.status} />}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-[#0B1220]"><FileSignature className="h-5 w-5 text-[#1D4ED8]" /> Signing</h2>
            {signingUrl ? (
              <div className="overflow-hidden rounded-lg border border-[#E2E8F0]">
                <iframe src={signingUrl} title="Embedded signing" className="h-[640px] w-full bg-white" />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
                <p className="font-semibold text-[#0B1220]">No embedded signing link is available yet.</p>
                <p className="mt-1 text-sm text-[#64748B]">Once DocuSeal returns signer links, they will render here.</p>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-[#0B1220]">Signer Timeline</h2>
            <div className="space-y-3">
              {(latestSubmission?.signers ?? []).map((signer) => (
                <div key={signer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#E2E8F0] p-3">
                  <div>
                    <p className="font-medium text-[#0B1220]">{signer.name}</p>
                    <p className="text-sm text-[#64748B]">{signer.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SignerStatusBadge status={signer.status} />
                    {signer.signingUrl ? <a href={signer.signingUrl} target="_blank" rel="noreferrer"><Button type="button" className="h-9 bg-white text-[#1E293B] ring-1 ring-[#CBD5E1] hover:bg-[#F8FAFC]"><ExternalLink className="h-4 w-4" /> Open</Button></a> : null}
                  </div>
                </div>
              ))}
              {!latestSubmission?.signers?.length ? <p className="text-sm text-[#64748B]">No signers have been added yet.</p> : null}
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-[#0B1220]">Scope</h2>
            <div className="space-y-3 text-sm">
              <Detail label="Workspace" value={document.workspace?.name ?? "Organization"} />
              <Detail label="Program" value={document.program?.name ?? "None"} />
              <Detail label="Project" value={document.project?.name ?? "None"} />
              <Detail label="Approval" value={document.approval ? `${document.approval.title} (${formatLabel(document.approval.status)})` : "None"} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-[#0B1220]"><ShieldCheck className="h-5 w-5 text-[#10B981]" /> Audit Trail</h2>
            {document.signedDocumentUrl ? <LinkButton href={document.signedDocumentUrl} label="Signed Document" /> : <p className="text-sm text-[#64748B]">Signed document URL is not available yet.</p>}
            {document.auditTrailUrl ? <div className="mt-2"><LinkButton href={document.auditTrailUrl} label="Audit Trail" /></div> : null}
          </Card>

          <DocumentPanel documents={[document]} />
        </aside>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-[#F8FAFC] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><p className="mt-1 font-medium text-[#0B1220]">{value}</p></div>;
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return <a href={href} target="_blank" rel="noreferrer"><Button type="button" className="w-full bg-white text-[#1E293B] ring-1 ring-[#CBD5E1] hover:bg-[#F8FAFC]"><ExternalLink className="h-4 w-4" /> {label}</Button></a>;
}
