"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { TaskTable } from "@/components/task-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { canArchiveTasks, canCreateTasks } from "@/lib/permissions";
import { useAuth } from "@/components/auth/auth-provider";
import type { Board, Priority, Task, TaskStatus, User } from "@/types/domain";

const statuses: TaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "WAITING", "BLOCKED", "COMPLETED", "APPROVED"];
const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function TasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mayCreateTasks = canCreateTasks(user?.role);
  const mayArchiveTasks = canArchiveTasks(user?.role);
  const [creating, setCreating] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: "", description: "", boardId: "", status: "NOT_STARTED" as TaskStatus, priority: "MEDIUM" as Priority, assigneeId: "", dueDate: "" });
  const { data, error, isLoading } = useQuery({ queryKey: ["tasks"], queryFn: () => api<Task[]>("/tasks") });
  const { data: boards } = useQuery({ queryKey: ["boards"], queryFn: () => api<Board[]>("/boards"), enabled: mayCreateTasks });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/users"), enabled: user?.role === "SUPER_ADMIN" || user?.role === "EXECUTIVE" });
  const tasks = data ?? [];
  const boardOptions = boards ?? [];
  const userOptions = users ?? (user ? [user] : []);

  const createTask = useMutation({
    mutationFn: () => api<Task>("/tasks", { method: "POST", body: JSON.stringify({ ...form, boardId: form.boardId || boardOptions[0]?.id, assigneeId: form.assigneeId || undefined, dueDate: form.dueDate ? new Date(`${form.dueDate}T12:00:00`).toISOString() : undefined }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      setCreating(false);
      setForm({ title: "", description: "", boardId: "", status: "NOT_STARTED", priority: "MEDIUM", assigneeId: "", dueDate: "" });
      toast({ title: "Task created", description: "The task was added to the selected board.", tone: "success" });
    },
    onError: (error) => toast({ title: "Unable to create task", description: error instanceof Error ? error.message : "Please check the task details.", tone: "error" })
  });

  const archiveTask = useMutation({
    mutationFn: (taskId: string) => api<Task>(`/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      setArchiveTarget(null);
      toast({ title: "Task archived", description: "The task is hidden from active views.", tone: "success" });
    },
    onError: (error) => toast({ title: "Unable to archive task", description: error instanceof Error ? error.message : "Please try again.", tone: "error" })
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    createTask.mutate();
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        description="A table view for assignments, priorities, due dates, and status."
        actions={mayCreateTasks ? <Button type="button" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create Task</Button> : null}
      />
      {isLoading ? (
        <TaskTableSkeleton />
      ) : error ? (
        <TaskState title="Tasks could not be loaded" description="Sign in, then return here to view and manage assigned work." actionLabel="Sign in" href="/login" />
      ) : tasks.length ? (
        <TaskTable tasks={tasks} canArchive={mayArchiveTasks} onArchive={setArchiveTarget} />
      ) : (
        <TaskState title="No tasks yet" description={mayCreateTasks ? "Create a task on an existing board to start tracking work across the organization." : "No assigned or accessible tasks are available for your role yet."} actionLabel={mayCreateTasks ? "Create Task" : undefined} onAction={() => setCreating(true)} />
      )}
      <Dialog open={creating} title="Create Task" description="Add a task to an existing project board." onClose={() => setCreating(false)}>
        <form className="space-y-4" onSubmit={submit}>
          <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Task title" required />
          <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" />
          <Select value={form.boardId || boardOptions[0]?.id || ""} onChange={(event) => setForm({ ...form, boardId: event.target.value })} required>{boardOptions.map((board) => <option key={board.id} value={board.id}>{board.name}{board.project ? ` - ${board.project.name}` : ""}</option>)}</Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</Select>
            <Select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}>{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}><option value="">No owner</option>{userOptions.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</Select>
            <Input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
          </div>
          {!boardOptions.length ? <p className="rounded-md border border-[#D4A017]/40 bg-[#D4A017]/10 p-3 text-sm text-[#64748B]">Create a project board first, then return here to add tasks.</p> : null}
          <Button type="submit" disabled={createTask.isPending || !boardOptions.length}>{createTask.isPending ? "Creating..." : "Create Task"}</Button>
        </form>
      </Dialog>
      <Dialog open={Boolean(archiveTarget)} title="Are you sure?" description="This will archive the task and hide it from normal task views." onClose={() => setArchiveTarget(null)}>
        <div className="space-y-4">
          <p className="text-sm text-[#64748B]">{archiveTarget?.title}</p>
          <div className="flex justify-end gap-3">
            <Button type="button" className="border border-[#CBD5E1] bg-white text-[#64748B] shadow-none hover:bg-[#F8FAFC]" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button type="button" disabled={archiveTask.isPending} onClick={() => archiveTarget && archiveTask.mutate(archiveTarget.id)}>{archiveTask.isPending ? "Archiving..." : "Archive Task"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function TaskState({ title, description, actionLabel, href, onAction }: { title: string; description: string; actionLabel?: string; href?: string; onAction?: () => void }) {
  return (
    <Card className="p-8 text-center">
      <h3 className="text-lg font-semibold text-[#0B1220]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#64748B]">{description}</p>
      {actionLabel && href ? (
        <Link href={href} className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#1D4ED8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2563EB]">
          {actionLabel}
        </Link>
      ) : actionLabel ? (
        <Button type="button" className="mt-5" onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </Card>
  );
}

function TaskTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-14 animate-pulse rounded-lg bg-slate-200" />
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-14 animate-pulse rounded-lg bg-white" />
      ))}
    </div>
  );
}
