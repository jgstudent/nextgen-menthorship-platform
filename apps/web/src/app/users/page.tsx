"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { canAssignSuperAdmin, canManageUsers, roleLabel } from "@/lib/permissions";
import type { Program, User, UserRole, UserStatus, Workspace } from "@/types/domain";

const roles: UserRole[] = ["SUPER_ADMIN", "EXECUTIVE", "PROJECT_MANAGER", "TEAM_MEMBER", "VOLUNTEER", "BENEFICIARY", "SPONSOR_VIEWER"];
const statuses: UserStatus[] = ["ACTIVE", "INVITED", "SUSPENDED", "DISABLED", "PENDING_APPROVAL"];

type UserForm = {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  temporaryPassword?: string;
  workspaceIds?: string[];
  programIds?: string[];
};

const emptyForm: UserForm = {
  email: "",
  firstName: "",
  lastName: "",
  role: "TEAM_MEMBER",
  status: "ACTIVE",
  temporaryPassword: ""
};

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/users"), enabled: canManageUsers(user?.role) });
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: () => api<Workspace[]>("/workspaces"), enabled: user?.role === "SUPER_ADMIN" });
  const { data: programs } = useQuery({ queryKey: ["programs"], queryFn: () => api<Program[]>("/programs"), enabled: user?.role === "SUPER_ADMIN" });

  const saveUser = useMutation({
    mutationFn: (payload: UserForm) => api<User>(payload.id ? `/users/${payload.id}` : "/users", { method: payload.id ? "PATCH" : "POST", body: JSON.stringify(toUserPayload(payload)) }),
    onSuccess: (_createdUser, payload) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setForm(null);
      toast({
        title: payload.id ? "User updated" : "User created",
        description: payload.id ? "The account changes were saved." : "Share the temporary password securely with the new user.",
        tone: "success"
      });
    },
    onError: (error) => toast({ title: "Unable to save user", description: error instanceof Error ? error.message : "Please check the user details and try again.", tone: "error" })
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "deactivate" | "reactivate" }) => api<User>(`/users/${id}/${action}`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] })
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, temporaryPassword }: { id: string; temporaryPassword: string }) => api<{ success: boolean; message: string }>(`/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ temporaryPassword }) }),
    onSuccess: (response) => {
      setResetUser(null);
      setTemporaryPassword("");
      toast({ title: "Temporary password saved", description: response.message, tone: "success" });
    },
    onError: (error) => toast({ title: "Unable to reset password", description: error instanceof Error ? error.message : "Please try again.", tone: "error" })
  });

  const users = useMemo(() => (data ?? []).filter((item) => {
    const haystack = `${item.email} ${item.firstName} ${item.lastName} ${item.role} ${item.status ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (roleFilter === "ALL" || item.role === roleFilter) && (statusFilter === "ALL" || item.status === statusFilter);
  }), [data, roleFilter, search, statusFilter]);

  if (!canManageUsers(user?.role)) {
    return (
      <>
        <PageHeader title="Users" description="User login administration is restricted to the Super Admin." />
        <Card className="border-dashed p-8 text-center text-sm text-[#64748B]">You do not have access to user management.</Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="User access" description="The Super Admin creates logins, sets roles, resets passwords, and controls account status." />
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_180px_210px_auto]">
        <label className="relative block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" className="pl-9" />
        </label>
        <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="ALL">All roles</option>
          {roles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">All statuses</option>
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </Select>
        {user?.role === "SUPER_ADMIN" ? <Button type="button" onClick={() => setForm({ ...emptyForm })}><Plus className="h-4 w-4" /> Create User</Button> : <span />}
      </div>

      {isLoading ? <EmptyState text="Loading users..." /> : users.length ? (
        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white shadow-soft">
          <div className="grid min-w-[980px] grid-cols-[1.2fr_0.9fr_0.8fr_1fr_1fr_220px] bg-[#0B1220] px-4 py-3 text-xs font-semibold uppercase text-white">
            <span>User</span><span>Role</span><span>Status</span><span>Workspaces</span><span>Programs</span><span>Actions</span>
          </div>
          {users.map((item) => (
            <div key={item.id} className="grid min-w-[980px] grid-cols-[1.2fr_0.9fr_0.8fr_1fr_1fr_220px] items-center border-t border-[#E2E8F0] px-4 py-3 text-sm">
              <button type="button" onClick={() => setSelectedUser(item)} className="text-left">
                <p className="font-semibold text-[#0B1220]">{item.firstName} {item.lastName}</p>
                <p className="text-[#64748B]">{item.email}</p>
              </button>
              <Badge tone={item.role === "SUPER_ADMIN" ? "gold" : item.role === "EXECUTIVE" ? "blue" : "gray"}>{roleLabel(item.role)}</Badge>
              <Badge tone={item.status === "ACTIVE" ? "green" : item.status === "SUSPENDED" || item.status === "DISABLED" ? "red" : "gold"}>{item.status ?? "ACTIVE"}</Badge>
              <span className="text-[#64748B]">{item.memberships?.map((membership) => membership.workspace.name).join(", ") || "None"}</span>
              <span className="text-[#64748B]">{item.programAssignments?.map((assignment) => assignment.program.name).join(", ") || "None"}</span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" className="h-8 px-3" onClick={() => setForm(toForm(item))}>Edit</Button>
                <Button type="button" className="h-8 bg-white px-3 text-[#1E293B] ring-1 ring-[#CBD5E1] hover:bg-[#F8FAFC]" onClick={() => statusMutation.mutate({ id: item.id, action: item.status === "ACTIVE" ? "deactivate" : "reactivate" })}>{item.status === "ACTIVE" ? "Suspend" : "Reactivate"}</Button>
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState text="No users match the current filters." />}

      <Dialog open={Boolean(selectedUser)} title="User Details" description="Role, lifecycle status, and current assignments." onClose={() => setSelectedUser(null)}>
        {selectedUser ? (
          <div className="space-y-4">
            <Detail label="Email" value={selectedUser.email} />
            <Detail label="Role" value={roleLabel(selectedUser.role)} />
            <Detail label="Status" value={selectedUser.status ?? "ACTIVE"} />
            <Detail label="Workspace assignments" value={selectedUser.memberships?.map((membership) => `${membership.workspace.name} (${roleLabel(membership.role)})`).join(", ") || "None"} />
            <Detail label="Program assignments" value={selectedUser.programAssignments?.map((assignment) => `${assignment.program.name} (${roleLabel(assignment.role)})`).join(", ") || "None"} />
            <div className="flex flex-wrap gap-2 pt-2">
              {user?.role === "SUPER_ADMIN" ? <Button type="button" onClick={() => { setResetUser(selectedUser); setTemporaryPassword(""); }}>Reset Password</Button> : null}
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog open={Boolean(form)} title={form?.id ? "Edit User" : "Create User"} description="Role and status changes are audited." onClose={() => setForm(null)}>
        {form ? <UserFormView form={form} actorRole={user?.role} workspaces={workspaces ?? []} programs={programs ?? []} saving={saveUser.isPending} onChange={setForm} onSubmit={(payload) => saveUser.mutate(payload)} /> : null}
      </Dialog>

      <Dialog open={Boolean(resetUser)} title="Reset User Password" description="Set a new temporary password for this account." onClose={() => setResetUser(null)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (resetUser) {
              resetPassword.mutate({ id: resetUser.id, temporaryPassword });
            }
          }}
        >
          <p className="text-sm text-[#64748B]">Share the temporary password securely. The user should change it after first login.</p>
          <Input type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} placeholder="Temporary password" minLength={8} required />
          <Button type="submit" disabled={resetPassword.isPending}>{resetPassword.isPending ? "Saving..." : "Save Temporary Password"}</Button>
        </form>
      </Dialog>
    </>
  );
}

function UserFormView({ form, actorRole, workspaces, programs, saving, onChange, onSubmit }: { form: UserForm; actorRole?: UserRole; workspaces: Workspace[]; programs: Program[]; saving: boolean; onChange: (form: UserForm) => void; onSubmit: (form: UserForm) => void }) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} placeholder="Email" required />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input value={form.firstName} onChange={(event) => onChange({ ...form, firstName: event.target.value })} placeholder="First name" required />
        <Input value={form.lastName} onChange={(event) => onChange({ ...form, lastName: event.target.value })} placeholder="Last name" required />
      </div>
      <Input value={form.avatarUrl ?? ""} onChange={(event) => onChange({ ...form, avatarUrl: event.target.value })} placeholder="Avatar/photo URL placeholder" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={form.role} onChange={(event) => onChange({ ...form, role: event.target.value as UserRole })}>
          {roles.filter((role) => role !== "SUPER_ADMIN" || canAssignSuperAdmin(actorRole)).map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
        </Select>
        <Select value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value as UserStatus })}>
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </Select>
      </div>
      {!form.id ? (
        <>
          <Input type="password" value={form.temporaryPassword ?? ""} onChange={(event) => onChange({ ...form, temporaryPassword: event.target.value })} placeholder="Temporary password" minLength={8} required />
          <p className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm text-[#64748B]">
            Share the temporary password securely. The user should change it after first login.
          </p>
          <AssignmentSelect label="Workspace assignments" values={form.workspaceIds ?? []} options={workspaces.map((workspace) => ({ id: workspace.id, label: workspace.name }))} onChange={(workspaceIds) => onChange({ ...form, workspaceIds })} />
          <AssignmentSelect label="Program assignments" values={form.programIds ?? []} options={programs.map((program) => ({ id: program.id, label: program.name }))} onChange={(programIds) => onChange({ ...form, programIds })} />
        </>
      ) : null}
      <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save User"}</Button>
    </form>
  );
}

function AssignmentSelect({ label, values, options, onChange }: { label: string; values: string[]; options: Array<{ id: string; label: string }>; onChange: (values: string[]) => void }) {
  return (
    <label className="block text-sm font-medium text-[#1E293B]">
      {label}
      <select
        multiple
        value={values}
        onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions).map((option) => option.value))}
        className="mt-1 min-h-28 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition focus:border-[var(--primary-blue)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
      >
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <span className="mt-1 block text-xs text-[#64748B]">Hold Ctrl or Cmd to select multiple.</span>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><p className="mt-1 text-sm font-medium text-[#0B1220]">{value}</p></div>;
}

function EmptyState({ text }: { text: string }) {
  return <Card className="border-dashed p-8 text-center text-sm text-[#64748B]">{text}</Card>;
}

function toForm(user: User): UserForm {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl ?? "",
    role: user.role,
    status: user.status ?? "ACTIVE"
  };
}

function toUserPayload(form: UserForm) {
  if (form.id) {
    return {
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      avatarUrl: form.avatarUrl || undefined,
      role: form.role,
      status: form.status
    };
  }

  return {
    email: form.email,
    firstName: form.firstName,
    lastName: form.lastName,
    avatarUrl: form.avatarUrl || undefined,
    role: form.role,
    status: form.status,
    temporaryPassword: form.temporaryPassword,
    workspaceIds: form.workspaceIds ?? [],
    programIds: form.programIds ?? []
  };
}
