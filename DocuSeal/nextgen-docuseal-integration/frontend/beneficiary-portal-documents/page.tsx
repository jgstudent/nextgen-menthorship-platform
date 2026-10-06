"use client";

import { useQuery } from "@tanstack/react-query";
import { DocumentPanel } from "@/components/documents/document-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { DocumentRecord } from "@/types/domain";

export default function BeneficiaryDocumentsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["beneficiary-documents"], queryFn: () => api<DocumentRecord[]>("/documents") });

  return (
    <>
      <PageHeader title="My Documents" description="Review and sign documents connected to your programs and workshops." />
      {error ? <Card className="p-8 text-center font-semibold text-red-600">Unable to load your documents.</Card> : isLoading ? <Card className="p-8 text-center font-semibold text-[#0B1220]">Loading documents...</Card> : <DocumentPanel documents={data ?? []} emptyText="You do not have any documents to sign yet." />}
    </>
  );
}
