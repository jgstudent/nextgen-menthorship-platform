"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Workspace } from "@/types/domain";

export default function WorkspacesPage() {
  const { data } = useQuery({ queryKey: ["workspaces"], queryFn: () => api<Workspace[]>("/workspaces") });

  return (
    <>
      <PageHeader title="Workspaces" description="Program areas that contain projects, boards, members, and activity." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((workspace) => (
          <Card key={workspace.id} className="border-t-4 border-t-[#10B981] p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
            <h3 className="font-semibold text-[#0B1220]">{workspace.name}</h3>
            <p className="mt-2 min-h-10 text-sm leading-6 text-[#64748B]">{workspace.description}</p>
            <div className="mt-4 flex gap-4 text-sm font-medium text-[#64748B]">
              <span>{workspace._count?.projects ?? 0} projects</span>
              <span>{workspace._count?.members ?? 0} members</span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
