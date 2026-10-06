"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MessageSquare, Paperclip, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { canCreateTasks, canDeleteTasks, canEditTasks, canManageProjects } from "@/lib/permissions";
import type { Board, BoardGroup, Comment, Priority, Project, Task, TaskStatus, User } from "@/types/domain";
import { useAuth } from "./auth/auth-provider";
import { FileAttachments } from "./file-attachments";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";
import { Sheet } from "./ui/sheet";
import { Textarea } from "./ui/textarea";
import { useToast } from "./ui/toast";
import { PriorityBadge, StatusBadge } from "./status-badge";

const statuses: TaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "WAITING", "BLOCKED", "COMPLETED", "APPROVED"];
const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

type BoardForm = { projectId: string; name: string; description: string };
type GroupForm = { name: string; color: string };
type TaskForm = {
  title: string;
  description: string;
  groupId: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string;
  dueDate: string;
};

const defaultTaskForm: TaskForm = {
  title: "",
  description: "",
  groupId: "",
  status: "NOT_STARTED",
  priority: "MEDIUM",
  assigneeId: "",
  dueDate: ""
};

export function BoardManagement() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const mayManageProjects = canManageProjects(user?.role);
  const mayCreateTasks = canCreateTasks(user?.role);
  const mayEditTasks = canEditTasks(user?.role);
  const mayDeleteTasks = canDeleteTasks(user?.role);
  const consumedCreateTaskParam = useRef(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [modal, setModal] = useState<"board" | "group" | "task" | "edit" | "delete" | null>(null);

  const boardsQuery = useQuery({ queryKey: ["boards"], queryFn: () => api<Board[]>("/boards") });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => api<Project[]>("/projects") });
  const boardQuery = useQuery({
    queryKey: ["board", selectedBoardId],
    queryFn: () => api<Board>(`/boards/${selectedBoardId}`),
    enabled: Boolean(selectedBoardId)
  });

  useEffect(() => {
    if (!selectedBoardId && boardsQuery.data?.[0]) {
      setSelectedBoardId(boardsQuery.data[0].id);
    }
  }, [boardsQuery.data, selectedBoardId]);

  useEffect(() => {
    if (searchParams.get("createTask") === "1" && boardQuery.data && mayCreateTasks && !consumedCreateTaskParam.current) {
      consumedCreateTaskParam.current = true;
      setModal("task");
    }
  }, [boardQuery.data, mayCreateTasks, searchParams]);

  const board = boardQuery.data;
  const boardItems = useMemo(() => board?.items ?? [], [board]);
  const boardGroups = useMemo(() => board?.groups ?? [], [board]);
  const selectedTask = useMemo(() => boardItems.find((task) => task.id === selectedTaskId) ?? null, [boardItems, selectedTaskId]);
  const assignees = useMemo(() => uniqueUsers(boardItems.map((task) => task.assignee).filter(Boolean) as User[]), [boardItems]);

  const invalidateBoard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["boards"] }),
      queryClient.invalidateQueries({ queryKey: ["board", selectedBoardId] }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    ]);
  };

  const createBoard = useMutation({
    mutationFn: (form: BoardForm) => {
      const project = projectsQuery.data?.find((item) => item.id === form.projectId);
      return api<Board>("/boards", {
        method: "POST",
        body: JSON.stringify({ projectId: form.projectId, workspaceId: project?.workspaceId, name: form.name, description: form.description })
      });
    },
    onSuccess: async (created) => {
      setSelectedBoardId(created.id);
      setModal(null);
      toast({ title: "Board created", description: "Your new board is ready." });
      await invalidateBoard();
    },
    onError: () => toast({ title: "Board was not created", description: "Check the selected project and try again.", tone: "error" })
  });

  const createGroup = useMutation({
    mutationFn: (form: GroupForm) =>
      api<BoardGroup>(`/boards/${selectedBoardId}/groups`, {
        method: "POST",
        body: JSON.stringify({ name: form.name, color: form.color, order: boardGroups.length + 1 })
      }),
    onSuccess: async () => {
      setModal(null);
      toast({ title: "Group created" });
      await invalidateBoard();
    },
    onError: () => toast({ title: "Group was not created", description: "Please try again.", tone: "error" })
  });

  const createTask = useMutation({
    mutationFn: (form: TaskForm) => api<Task>("/tasks", { method: "POST", body: JSON.stringify(taskPayload(selectedBoardId, form)) }),
    onSuccess: async () => {
      setModal(null);
      toast({ title: "Task created" });
      await invalidateBoard();
    },
    onError: () => toast({ title: "Task was not created", description: "Please review the task details.", tone: "error" })
  });

  const updateTask = useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<TaskForm> }) => api<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(taskPayload(selectedBoardId, form)) }),
    onSuccess: async () => {
      setModal(null);
      toast({ title: "Task updated" });
      await invalidateBoard();
    },
    onError: () => toast({ title: "Task was not updated", description: "Please try again.", tone: "error" })
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => api<Task>(`/tasks/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setModal(null);
      setSelectedTaskId(null);
      toast({ title: "Task archived" });
      await invalidateBoard();
    },
    onError: () => toast({ title: "Task was not archived", description: "Please try again.", tone: "error" })
  });

  const addComment = useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: string }) => api<Comment>("/comments", { method: "POST", body: JSON.stringify({ itemId, body }) }),
    onSuccess: async () => {
      toast({ title: "Comment added" });
      await invalidateBoard();
    },
    onError: () => toast({ title: "Comment was not added", description: "Please try again.", tone: "error" })
  });

  function onDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const groupId = event.over?.id ? String(event.over.id) : "";
    const task = boardItems.find((item) => item.id === taskId);
    if (!mayEditTasks || !task || !groupId || task.groupId === groupId) {
      return;
    }
    updateTask.mutate({ id: taskId, form: { groupId } });
  }

  if (boardsQuery.isLoading) {
    return <BoardSkeleton />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={selectedBoardId} onChange={(event) => setSelectedBoardId(event.target.value)} className="sm:w-72">
            {(boardsQuery.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          {board ? <span className="text-sm font-medium text-[#64748B]">{board.project?.name}</span> : null}
        </div>
        {mayManageProjects || mayCreateTasks ? (
          <div className="flex flex-wrap gap-2">
            {mayManageProjects ? (
              <>
                <Button type="button" onClick={() => setModal("board")}>
                  <Plus className="h-4 w-4" /> Board
                </Button>
                <Button type="button" className="bg-[#10B981] hover:bg-emerald-600" onClick={() => setModal("group")} disabled={!board}>
                  <Plus className="h-4 w-4" /> Group
                </Button>
              </>
            ) : null}
            {mayCreateTasks ? (
              <Button type="button" className="bg-[#D4A017] text-[#0B1220] hover:bg-yellow-500" onClick={() => setModal("task")} disabled={!board}>
                <Plus className="h-4 w-4" /> Task
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!boardsQuery.data?.length ? (
        <EmptyState title="No boards yet" description="Create a board from an existing project to start organizing tasks." action={mayManageProjects ? <Button onClick={() => setModal("board")}>Create board</Button> : null} />
      ) : boardQuery.isLoading ? (
        <BoardSkeleton />
      ) : board ? (
        <Card className="p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#0B1220]">{board.name}</h3>
              <p className="text-sm text-[#64748B]">{board.description || "No board description yet."}</p>
            </div>
            <Badge tone="blue">{boardItems.length} tasks</Badge>
          </div>
          <DndContext onDragEnd={onDragEnd}>
            <div className="grid gap-4 xl:grid-cols-3">
              {boardGroups.map((group) => (
                <KanbanColumn key={group.id} group={group} tasks={boardItems.filter((task) => task.groupId === group.id)} canDrag={mayEditTasks} onTaskClick={setSelectedTaskId} />
              ))}
            </div>
          </DndContext>
        </Card>
      ) : null}

      <BoardDialog open={modal === "board"} projects={projectsQuery.data ?? []} pending={createBoard.isPending} onClose={() => setModal(null)} onSubmit={(form) => createBoard.mutate(form)} />
      <GroupDialog open={modal === "group"} pending={createGroup.isPending} onClose={() => setModal(null)} onSubmit={(form) => createGroup.mutate(form)} />
      <TaskDialog open={modal === "task"} title="Create task" groups={boardGroups} assignees={assignees} pending={createTask.isPending} onClose={() => setModal(null)} onSubmit={(form) => createTask.mutate(form)} />
      <TaskDialog
        open={modal === "edit" && Boolean(selectedTask)}
        title="Edit task"
        task={selectedTask ?? undefined}
        groups={boardGroups}
        assignees={assignees}
        pending={updateTask.isPending}
        onClose={() => setModal(null)}
        onSubmit={(form) => selectedTask && updateTask.mutate({ id: selectedTask.id, form })}
      />
      <DeleteDialog open={modal === "delete" && Boolean(selectedTask)} pending={deleteTask.isPending} task={selectedTask ?? undefined} onClose={() => setModal(null)} onConfirm={() => selectedTask && deleteTask.mutate(selectedTask.id)} />
      <TaskDrawer
        task={selectedTask}
        open={Boolean(selectedTaskId)}
        onClose={() => setSelectedTaskId(null)}
        onEdit={() => setModal("edit")}
        onDelete={() => setModal("delete")}
        onComment={(body) => selectedTask && addComment.mutate({ itemId: selectedTask.id, body })}
        commentPending={addComment.isPending}
        canEdit={mayEditTasks}
        canDelete={mayDeleteTasks}
      />
    </div>
  );
}

function KanbanColumn({ group, tasks, canDrag, onTaskClick }: { group: BoardGroup; tasks: Task[]; canDrag: boolean; onTaskClick: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id });

  return (
    <section ref={setNodeRef} className={`min-h-96 rounded-lg border p-3 transition ${isOver ? "border-[#10B981] bg-[#D1FAE5]" : "border-[#E2E8F0] bg-[#F8FAFC]"}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color ?? "#1d4ed8" }} />
          <h3 className="font-semibold text-[#0B1220]">{group.name}</h3>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#64748B] ring-1 ring-[#E2E8F0]">{tasks.length}</span>
      </div>
      <div className="space-y-3">
        {tasks.length ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} canDrag={canDrag} onClick={() => onTaskClick(task.id)} />)
        ) : (
          <div className="rounded-md border border-dashed border-[#CBD5E1] bg-white/80 p-5 text-center text-sm text-[#64748B]">Drop tasks here or create a new task in this group.</div>
        )}
      </div>
    </section>
  );
}

function TaskCard({ task, canDrag, onClick }: { task: Task; canDrag: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled: !canDrag });
  const style = { transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined };

  return (
    <Card ref={setNodeRef} style={style} className={`cursor-pointer p-4 transition ${isDragging ? "opacity-70 shadow-soft" : "hover:-translate-y-0.5 hover:border-[#1D4ED8] hover:shadow-soft"}`} onClick={onClick} {...listeners} {...attributes}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold text-[#0B1220]">{task.title}</h4>
        <PriorityBadge priority={task.priority} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#64748B]">{task.description || "No description yet."}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={task.status} />
        <DueDateBadge dueDate={task.dueDate} status={task.status} />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Avatar user={task.assignee} size="sm" />
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B]">
          <MessageSquare className="h-3.5 w-3.5" /> {task.comments?.length ?? 0}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B]">
          <Paperclip className="h-3.5 w-3.5" /> {task.files?.length ?? 0}
        </span>
      </div>
    </Card>
  );
}

function BoardDialog({ open, projects, pending, onClose, onSubmit }: { open: boolean; projects: Project[]; pending: boolean; onClose: () => void; onSubmit: (form: BoardForm) => void }) {
  const [form, setForm] = useState<BoardForm>({ projectId: "", name: "", description: "" });

  useEffect(() => {
    if (open && projects[0] && !form.projectId) {
      setForm((current) => ({ ...current, projectId: projects[0].id }));
    }
  }, [open, projects, form.projectId]);

  return (
    <Dialog open={open} title="Create board" description="Create a board inside an existing Phase 1 project." onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => submit(event, () => onSubmit(form))}>
        <Field label="Project">
          <Select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} required>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Board name">
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </Field>
        <FormActions pending={pending} onClose={onClose} submitLabel="Create board" />
      </form>
    </Dialog>
  );
}

function GroupDialog({ open, pending, onClose, onSubmit }: { open: boolean; pending: boolean; onClose: () => void; onSubmit: (form: GroupForm) => void }) {
  const [form, setForm] = useState<GroupForm>({ name: "", color: "#1d4ed8" });

  return (
    <Dialog open={open} title="Create group" description="Add a new swimlane to the selected board." onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => submit(event, () => onSubmit(form))}>
        <Field label="Group name">
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </Field>
        <Field label="Color">
          <Input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} className="h-11 p-1" />
        </Field>
        <FormActions pending={pending} onClose={onClose} submitLabel="Create group" />
      </form>
    </Dialog>
  );
}

function TaskDialog({ open, title, task, groups, assignees, pending, onClose, onSubmit }: { open: boolean; title: string; task?: Task; groups: BoardGroup[]; assignees: User[]; pending: boolean; onClose: () => void; onSubmit: (form: TaskForm) => void }) {
  const [form, setForm] = useState<TaskForm>(defaultTaskForm);

  useEffect(() => {
    if (!open) {
      return;
    }
    setForm({
      title: task?.title ?? "",
      description: task?.description ?? "",
      groupId: task?.groupId ?? groups[0]?.id ?? "",
      status: task?.status ?? "NOT_STARTED",
      priority: task?.priority ?? "MEDIUM",
      assigneeId: task?.assignee?.id ?? "",
      dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : ""
    });
  }, [open, task, groups]);

  return (
    <Dialog open={open} title={title} description="Set ownership, timing, status, and priority." onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => submit(event, () => onSubmit(form))}>
        <Field label="Task title">
          <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Group">
            <Select value={form.groupId} onChange={(event) => setForm({ ...form, groupId: event.target.value })}>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assignee">
            <Select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}>
              <option value="">Unassigned</option>
              {assignees.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Due date">
          <Input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
        </Field>
        <FormActions pending={pending} onClose={onClose} submitLabel={task ? "Save changes" : "Create task"} />
      </form>
    </Dialog>
  );
}

function TaskDrawer({ task, open, commentPending, canEdit, canDelete, onClose, onEdit, onDelete, onComment }: { task: Task | null; open: boolean; commentPending: boolean; canEdit: boolean; canDelete: boolean; onClose: () => void; onEdit: () => void; onDelete: () => void; onComment: (body: string) => void }) {
  const [body, setBody] = useState("");

  if (!task) {
    return null;
  }

  return (
    <Sheet open={open} title={task.title} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          <DueDateBadge dueDate={task.dueDate} status={task.status} />
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-sm font-semibold text-[#64748B]">Assignee</p>
          <div className="mt-3 flex items-center gap-3">
            <Avatar user={task.assignee} />
            <span className="font-medium text-[#0B1220]">{task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned"}</span>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-[#0B1220]">Description</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#64748B]">{task.description || "No description yet."}</p>
        </div>
        {canEdit || canDelete ? (
          <div className="flex gap-2">
            {canEdit ? (
              <Button type="button" onClick={onEdit}>
                Edit task
              </Button>
            ) : null}
            {canDelete ? (
              <Button type="button" className="bg-red-600 hover:bg-red-700" onClick={onDelete}>
                <Trash2 className="h-4 w-4" /> Archive
              </Button>
            ) : null}
          </div>
        ) : null}
        <FileAttachments taskId={task.id} />
        <div className="border-t border-slate-200 pt-5">
          <h3 className="font-semibold text-[#0B1220]">Comments</h3>
          <div className="mt-3 space-y-3">
            {task.comments?.length ? (
              task.comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <div className="flex items-center gap-2">
                    <Avatar user={comment.author} size="sm" />
                    <span className="text-sm font-semibold text-[#0B1220]">{comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : "Member"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#1E293B]">{comment.body}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-[#CBD5E1] p-4 text-sm text-[#64748B]">No comments yet.</p>
            )}
          </div>
          <form className="mt-4 space-y-3" onSubmit={(event) => submit(event, () => body.trim() && (onComment(body.trim()), setBody("")))}>
            <Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add a comment..." />
            <Button type="submit" disabled={commentPending || !body.trim()}>
              Add comment
            </Button>
          </form>
        </div>
      </div>
    </Sheet>
  );
}

function DeleteDialog({ open, task, pending, onClose, onConfirm }: { open: boolean; task?: Task; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} title="Are you sure?" description="This archives the task and hides it from normal board views." onClose={onClose}>
      <p className="text-sm text-[#64748B]">Archive <span className="font-semibold text-[#0B1220]">{task?.title}</span>?</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" className="bg-white text-[#1E293B] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" className="bg-red-600 hover:bg-red-700" disabled={pending} onClick={onConfirm}>
          Archive task
        </Button>
      </div>
    </Dialog>
  );
}

function DueDateBadge({ dueDate, status }: { dueDate?: string; status: TaskStatus }) {
  if (!dueDate) {
    return <Badge tone="gray">No due date</Badge>;
  }
  const date = new Date(dueDate);
  const overdue = date.getTime() < new Date().setHours(0, 0, 0, 0) && !["COMPLETED", "APPROVED"].includes(status);
  return (
    <Badge tone={overdue ? "red" : "gray"}>
      <CalendarDays className="mr-1 inline h-3 w-3" /> {date.toLocaleDateString()}
    </Badge>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Label>
      <span className="mb-1 block">{label}</span>
      {children}
    </Label>
  );
}

function FormActions({ pending, submitLabel, onClose }: { pending: boolean; submitLabel: string; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" className="bg-white text-[#1E293B] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" disabled={pending}>
        {submitLabel}
      </Button>
    </div>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <Card className="p-10 text-center">
      <h3 className="text-lg font-semibold text-[#0B1220]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#64748B]">{description}</p>
      <div className="mt-5">{action}</div>
    </Card>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-96 animate-pulse rounded-lg bg-slate-200/80" />
      ))}
    </div>
  );
}

function submit(event: FormEvent, callback: () => void) {
  event.preventDefault();
  callback();
}

function uniqueUsers(users: User[] = []) {
  return Array.from(new Map(users.map((user) => [user.id, user])).values());
}

function taskPayload(boardId: string, form: Partial<TaskForm>) {
  return {
    ...(boardId ? { boardId } : {}),
    ...(form.title !== undefined ? { title: form.title } : {}),
    ...(form.description !== undefined ? { description: form.description } : {}),
    ...(form.groupId ? { groupId: form.groupId } : {}),
    ...(form.status ? { status: form.status } : {}),
    ...(form.priority ? { priority: form.priority } : {}),
    ...(form.assigneeId ? { assigneeId: form.assigneeId } : {}),
    ...(form.dueDate ? { dueDate: form.dueDate } : {})
  };
}
