"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Plus } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { canArchiveProjects, canManageProjects } from "@/lib/permissions";
import type { Organization, Project, ProjectStatus, Workspace } from "@/types/domain";

const projectStatuses: ProjectStatus[] = ["PLANNING", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"];

export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", description: "", status: "PLANNING" as ProjectStatus, workspaceId: "" });
  const { data } = useQuery({ queryKey: ["projects"], queryFn: () => api<Project[]>("/projects") });
  const mayCreate = canManageProjects(user?.role);
  const mayArchive = canArchiveProjects(user?.role);
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: () => api<Workspace[]>("/workspaces"), enabled: mayCreate });
  const { data: organizations } = useQuery({ queryKey: ["organizations"], queryFn: () => api<Organization[]>("/organizations"), enabled: mayCreate });
  const workspaceOptions = workspaces ?? [];
  const organizationId = organizations?.[0]?.id ?? workspaceOptions[0]?.organizationId;
  const slug = useMemo(() => form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "new-project", [form.name]);
  const createProject = useMutation({
    mutationFn: () => api<Project>("/projects", { method: "POST", body: JSON.stringify({ organizationId, workspaceId: form.workspaceId || workspaceOptions[0]?.id, name: form.name, slug, description: form.description || undefined, status: form.status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setCreating(false);
      setForm({ name: "", description: "", status: "PLANNING", workspaceId: "" });
      toast({ title: "Project created", description: "The new project is ready for boards and tasks.", tone: "success" });
    },
    onError: (error) => toast({ title: "Unable to create project", description: error instanceof Error ? error.message : "Please check the project details.", tone: "error" })
  });

  const archiveProject = useMutation({
    mutationFn: (projectId: string) => api<Project>(`/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setArchiveTarget(null);
      toast({ title: "Project archived", description: "The project is hidden from active views.", tone: "success" });
    },
    onError: (error) => toast({ title: "Unable to archive project", description: error instanceof Error ? error.message : "Please try again.", tone: "error" })
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    createProject.mutate();
  }

  return (
    <>
      <PageHeader title="Projects" description="Track nonprofit initiatives from planning through completion." actions={mayCreate ? <Button type="button" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create Project</Button> : null} />
      <div className="grid gap-4 lg:grid-cols-2">
        {(data ?? []).map((project) => (
          <Card key={project.id} className="border-t-4 border-t-[#1D4ED8] p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-[#0B1220]">{project.name}</h3>
                <p className="mt-1 text-sm text-[#64748B]">{project.workspace?.name}</p>
              </div>
              <Badge tone={project.status === "ACTIVE" ? "green" : "gray"}>{project.status}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#64748B]">{project.description}</p>
            {mayArchive ? (
              <div className="mt-4 flex justify-end">
                <Button type="button" className="border border-[#CBD5E1] bg-white text-[#64748B] shadow-none hover:bg-[#F8FAFC]" onClick={() => setArchiveTarget(project)}>
                  <Archive className="h-4 w-4" /> Archive
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
      <Dialog open={creating} title="Create Project" description="Add a scoped operational project." onClose={() => setCreating(false)}>
        <form className="space-y-4" onSubmit={submit}>
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Project name" required />
          <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" />
          <Select value={form.workspaceId || workspaceOptions[0]?.id || ""} onChange={(event) => setForm({ ...form, workspaceId: event.target.value })} required>{workspaceOptions.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</Select>
          <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })}>{projectStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</Select>
          <p className="text-xs text-[#64748B]">Slug: {slug}</p>
          <Button type="submit" disabled={createProject.isPending || !workspaceOptions.length || !organizationId}>{createProject.isPending ? "Creating..." : "Create Project"}</Button>
        </form>
      </Dialog>
      <Dialog open={Boolean(archiveTarget)} title="Are you sure?" description="This will archive the project and hide it from normal project views." onClose={() => setArchiveTarget(null)}>
        <div className="space-y-4">
          <p className="text-sm text-[#64748B]">{archiveTarget?.name}</p>
          <div className="flex justify-end gap-3">
            <Button type="button" className="border border-[#CBD5E1] bg-white text-[#64748B] shadow-none hover:bg-[#F8FAFC]" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button type="button" disabled={archiveProject.isPending} onClick={() => archiveTarget && archiveProject.mutate(archiveTarget.id)}>{archiveProject.isPending ? "Archiving..." : "Archive Project"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
