"use client";

import Link from "next/link";
import { ExternalLink, FileSignature } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DocumentRecord, DocumentStatus, SignerStatus } from "@/types/domain";

export function DocumentPanel({ documents, emptyText = "No documents yet." }: { documents: DocumentRecord[]; emptyText?: string }) {
  if (!documents.length) {
    return <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center"><FileSignature className="h-8 w-8 text-[#64748B]" /><p className="font-semibold text-[#0B1220]">{emptyText}</p><p className="text-sm text-[#64748B]">Signed documents and signer timelines will appear here.</p></Card>;
  }

  return (
    <div className="grid gap-3">
      {documents.map((document) => (
        <Card key={document.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#0B1220]">{document.title}</h3>
                <DocumentStatusBadge status={document.status} />
              </div>
              <p className="mt-1 text-sm text-[#64748B]">{document.description || document.workspace?.name || "Signature document"}</p>
            </div>
            <Link href={`/documents/${document.id}`}>
              <Button type="button" className="h-9 bg-white text-[#1E293B] ring-1 ring-[#CBD5E1] hover:bg-[#F8FAFC]"><ExternalLink className="h-4 w-4" /> Open</Button>
            </Link>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {(document.submissions?.[0]?.signers ?? []).slice(0, 3).map((signer) => (
              <div key={signer.id} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm">
                <p className="font-medium text-[#0B1220]">{signer.name}</p>
                <p className="text-[#64748B]">{signer.email}</p>
                <div className="mt-2"><SignerStatusBadge status={signer.status} /></div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const tone = status === "COMPLETED" ? "green" : status === "DECLINED" || status === "VOIDED" ? "red" : status === "APPROVAL_REQUIRED" ? "gold" : "blue";
  return <Badge tone={tone}>{formatLabel(status)}</Badge>;
}

export function SignerStatusBadge({ status }: { status: SignerStatus }) {
  const tone = status === "SIGNED" ? "green" : status === "DECLINED" || status === "VOIDED" ? "red" : status === "VIEWED" ? "gold" : "blue";
  return <Badge tone={tone}>{formatLabel(status)}</Badge>;
}

export function formatLabel(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
