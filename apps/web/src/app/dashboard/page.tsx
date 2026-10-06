"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, FolderKanban, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { canCreateTasks, canManageProjects, canUploadFiles, isReadOnlyRole, roleLabel } from "@/lib/permissions";
import type { Approval, Meeting, MeetingActionItem, Project, Task, UserRole } from "@/types/domain";
import { StatusBadge } from "@/components/status-badge";

type Dashboard = {
  role: UserRole;
  workspaceCount: number;
  accessibleTaskCount: number;
  assignedTasks: Task[];
  overdueTasks: Task[];
  dueSoonTasks: Task[];
  activeProjects: Project[];
  recentUpdates: Array<{ id: string; action: string; entityType: string; createdAt: string }>;
  upcomingMeetings: Meeting[];
  todaysMeetings: Meeting[];
  pendingActionItems: MeetingActionItem[];
  recentlyCompletedMeetings: Meeting[];
  pendingApprovals: Approval[];
  overdueApprovals: Approval[];
  recentApprovalDecisions: Approval[];
  governance?: {
    activeUserCount: number;
    suspendedUserCount: number;
    beneficiaryCount: number;
    activeProgramCount: number;
    pendingApprovalsCount: number;
    executiveGovernance?: {
      workspace: { id: string; name: string };
      pendingApprovals: number;
      upcomingBoardMeetings: number;
      policiesUnderReview: number;
      resolutionsAwaitingApproval: number;
      restrictedSignaturesPending: number;
      recentGovernanceAuditActivity: Array<{ id: string; action: string; entityType: string; timestamp: string; actor?: { firstName: string; lastName: string } }>;
    } | null;
    roleDistribution: Array<{ role: UserRole; _count: { role: number } }>;
    auditActivity: Array<{ id: string; action: string; entityType: string; timestamp: string; actor?: { firstName: string; lastName: string } }>;
  };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dashboard>("/dashboard") });
  const role = data?.role ?? user?.role;
  const profile = roleProfile(role);
  const quickLinks = roleQuickLinks(role);

  const stats = [
    { label: "Assigned Tasks", value: data?.assignedTasks.length ?? 0, icon: CheckCircle2, tone: "primary" },
    { label: "Overdue", value: data?.overdueTasks.length ?? 0, icon: TriangleAlert, tone: "warning" },
    { label: "Active Projects", value: data?.activeProjects.length ?? 0, icon: FolderKanban, tone: "secondary" },
    { label: "Upcoming Meetings", value: data?.upcomingMeetings.length ?? 0, icon: CalendarClock, tone: "secondary" }
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="One shared portal. Your dashboard adapts to your role and workspace membership." />
      <Card className="mb-5 overflow-hidden border-[#D4A017]/25 p-0 shadow-soft">
        <div className="h-1 bg-gradient-to-r from-[#1D4ED8] via-[#10B981] to-[#D4A017]" />
        <div className="grid gap-4 p-4 lg:grid-cols-[1.55fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Shared Portal Access</p>
            <h2 className="mt-1 text-lg font-bold text-[#0B1220]">{roleLabel(role)} Dashboard</h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-5 text-[#64748B]">{profile.description}</p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <RoleMetric compact label="Accessible Workspaces" value={data?.workspaceCount ?? 0} loading={isLoading} />
            <RoleMetric compact label="Accessible Tasks" value={data?.accessibleTaskCount ?? 0} loading={isLoading} />
          </div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const primary = stat.tone === "primary";
          const warning = stat.tone === "warning";
          return (
            <Card
              key={stat.label}
              className={`border-t-4 p-4 transition hover:-translate-y-0.5 hover:shadow-soft ${primary ? "border-t-[#1D4ED8]" : warning ? "border-t-[#D4A017]" : "border-t-[#CBD5E1]"}`}
            >
              <div className="flex items-center justify-between">
                <p className={`${primary ? "text-sm" : "text-xs"} font-semibold uppercase tracking-wide text-[#64748B]`}>{stat.label}</p>
                <span className={`rounded-md p-2 ${primary ? "bg-[#DBEAFE] text-[#1D4ED8]" : warning ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-[#64748B]"}`}>
                  <Icon className={`${primary ? "h-5 w-5" : "h-4 w-4"}`} />
                </span>
              </div>
              <p className={`${primary ? "mt-4 text-3xl" : "mt-3 text-2xl"} font-bold tracking-tight text-[#0B1220]`}>{isLoading ? "-" : stat.value}</p>
            </Card>
          );
        })}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <h3 className="font-semibold text-[#0B1220]">Role Permissions</h3>
          <div className="mt-4 grid gap-3">
            {profile.permissions.map((permission) => (
              <div key={permission} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm font-medium text-[#1E293B]">
                {permission}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-[#0B1220]">Primary Actions</h3>
          <div className="mt-4 grid gap-3">
            <ActionState active={canManageProjects(role)} label="Manage workspaces, projects, and boards" />
            <ActionState active={canCreateTasks(role)} label="Create and update tasks" />
            <ActionState active={canUploadFiles(role)} label="Upload task attachments" />
            <ActionState active={isReadOnlyRole(role)} label="Read-only visibility for governance and review" />
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#1D4ED8] transition hover:border-[#1D4ED8] hover:bg-[#DBEAFE]">
                {link.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
      {data?.governance ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="p-5">
            <h3 className="font-semibold text-[#0B1220]">Governance Overview</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <RoleMetric label="Active Users" value={data.governance.activeUserCount} loading={isLoading} />
              <RoleMetric label="Suspended / Disabled" value={data.governance.suspendedUserCount} loading={isLoading} />
              <RoleMetric label="Beneficiaries" value={data.governance.beneficiaryCount} loading={isLoading} />
              <RoleMetric label="Active Programs" value={data.governance.activeProgramCount} loading={isLoading} />
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-[#0B1220]">Role Distribution</h3>
            <div className="mt-4 space-y-3">
              {data.governance.roleDistribution.map((row) => (
                <div key={row.role} className="flex items-center justify-between rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm">
                  <span className="font-medium text-[#1E293B]">{roleLabel(row.role)}</span>
                  <span className="font-semibold text-[#0B1220]">{row._count.role}</span>
                </div>
              ))}
            </div>
          </Card>
          {data.governance.executiveGovernance ? (
            <Card className="p-5 xl:col-span-2">
              <h3 className="font-semibold text-[#0B1220]">Executive Governance</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <RoleMetric label="Pending Governance Approvals" value={data.governance.executiveGovernance.pendingApprovals} loading={isLoading} />
                <RoleMetric label="Upcoming Board Meetings" value={data.governance.executiveGovernance.upcomingBoardMeetings} loading={isLoading} />
                <RoleMetric label="Policies Under Review" value={data.governance.executiveGovernance.policiesUnderReview} loading={isLoading} />
                <RoleMetric label="Resolutions Awaiting Approval" value={data.governance.executiveGovernance.resolutionsAwaitingApproval} loading={isLoading} />
                <RoleMetric label="Restricted Signatures" value={data.governance.executiveGovernance.restrictedSignaturesPending} loading={isLoading} />
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold text-[#0B1220]">Today&apos;s Meetings</h3>
          <div className="mt-4 space-y-3">
            {(data?.todaysMeetings ?? []).length ? (data?.todaysMeetings ?? []).map((meeting) => (
              <div key={meeting.id} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="font-medium text-[#1E293B]">{meeting.title}</p>
                <p className="text-sm text-[#64748B]">{formatTime(meeting.startTime)} • {meeting.project?.name ?? meeting.workspace?.name ?? "Organization-wide"}</p>
              </div>
            )) : <EmptyLine text="No meetings scheduled for today." />}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-[#0B1220]">Pending Action Items</h3>
          <div className="mt-4 space-y-3">
            {(data?.pendingActionItems ?? []).length ? (data?.pendingActionItems ?? []).map((item) => (
              <div key={item.id} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="font-medium text-[#1E293B]">{item.title}</p>
                <p className="text-sm text-[#64748B]">{item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}` : "Unassigned"}{item.dueDate ? ` • Due ${new Date(item.dueDate).toLocaleDateString()}` : ""}</p>
              </div>
            )) : <EmptyLine text="No pending meeting action items." />}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold text-[#0B1220]">Assigned Tasks</h3>
          <div className="mt-4 space-y-3">
            {(data?.assignedTasks ?? []).length ? (data?.assignedTasks ?? []).map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition hover:border-[#1D4ED8] hover:bg-white">
                <div>
                  <p className="font-medium text-[#1E293B]">{task.title}</p>
                  <p className="text-sm text-[#64748B]">{task.board?.project?.name}</p>
                </div>
                <StatusBadge status={task.status} />
              </div>
            )) : <EmptyLine text="No assigned tasks in your current workspace access." />}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-[#0B1220]">Recent Updates</h3>
          <div className="mt-4 space-y-3">
            {(data?.recentUpdates ?? []).length ? (data?.recentUpdates ?? []).map((update) => (
              <div key={update.id} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm text-[#64748B]">
                <span className="font-semibold text-[#1E293B]">{update.entityType}</span> {update.action}
              </div>
            )) : <EmptyLine text="No recent updates are visible for your workspace access." />}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold text-[#0B1220]">Pending Approvals</h3>
          <div className="mt-4 space-y-3">
            {(data?.pendingApprovals ?? []).length ? (data?.pendingApprovals ?? []).map((approval) => (
              <div key={approval.id} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="font-medium text-[#1E293B]">{approval.title}</p>
                <p className="text-sm text-[#64748B]">{approval.status.replaceAll("_", " ")} • {approval.workspace?.name}</p>
              </div>
            )) : <EmptyLine text="No pending approvals are visible for your access." />}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-[#0B1220]">Overdue Approvals</h3>
          <div className="mt-4 space-y-3">
            {(data?.overdueApprovals ?? []).length ? (data?.overdueApprovals ?? []).map((approval) => (
              <div key={approval.id} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="font-medium text-[#1E293B]">{approval.title}</p>
                <p className="text-sm text-[#64748B]">{approval.dueDate ? `Due ${new Date(approval.dueDate).toLocaleDateString()}` : "No due date"}</p>
              </div>
            )) : <EmptyLine text="No overdue approvals." />}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold text-[#0B1220]">Upcoming Meetings</h3>
          <div className="mt-4 space-y-3">
            {(data?.upcomingMeetings ?? []).length ? (data?.upcomingMeetings ?? []).map((meeting) => (
              <div key={meeting.id} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="font-medium text-[#1E293B]">{meeting.title}</p>
                <p className="text-sm text-[#64748B]">{new Date(meeting.startTime).toLocaleString()} • {meeting.project?.name ?? meeting.workspace?.name ?? "Organization-wide"}</p>
              </div>
            )) : <EmptyLine text="No upcoming meetings are visible for your access." />}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-[#0B1220]">Recently Completed Meetings</h3>
          <div className="mt-4 space-y-3">
            {(data?.recentlyCompletedMeetings ?? []).length ? (data?.recentlyCompletedMeetings ?? []).map((meeting) => (
              <div key={meeting.id} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="font-medium text-[#1E293B]">{meeting.title}</p>
                <p className="text-sm text-[#64748B]">{meeting.project?.name ?? meeting.workspace?.name ?? "Organization-wide"}</p>
              </div>
            )) : <EmptyLine text="No completed meetings yet." />}
          </div>
        </Card>
      </div>
    </>
  );
}

function RoleMetric({ label, value, loading, compact = false }: { label: string; value: number; loading: boolean; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] ${compact ? "p-3" : "p-4"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className={`${compact ? "mt-1 text-xl" : "mt-2 text-2xl"} font-bold text-[#0B1220]`}>{loading ? "-" : value}</p>
    </div>
  );
}

function ActionState({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm">
      <span className="font-medium text-[#1E293B]">{label}</span>
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${active ? "bg-[#D1FAE5] text-[#047857]" : "bg-slate-200 text-[#64748B]"}`}>{active ? "Allowed" : "Limited"}</span>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">{text}</p>;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function roleProfile(role?: UserRole) {
  switch (role) {
    case "SUPER_ADMIN":
      return {
        description: "Full organization administration across every workspace, project, board, task, member, and file in the shared portal.",
        permissions: ["Organization-wide administration", "Manage all projects and boards", "Create, update, and delete tasks"]
      };
    case "EXECUTIVE":
      return {
        description: "Leadership visibility for governance, approvals, sponsor-ready reporting, executive operations, and restricted board work.",
        permissions: ["Review organization-wide work", "Manage governance approvals", "Access executive reports and restricted documents"]
      };
    case "PROJECT_MANAGER":
      return {
        description: "Delivery controls for assigned programs, projects, tasks, beneficiaries, workshops, and operational reviews.",
        permissions: ["Manage accessible projects and boards", "Create and assign tasks", "Coordinate assigned programs and workshops"]
      };
    case "TEAM_MEMBER":
      return {
        description: "A collaboration dashboard focused on assigned projects, tasks, meetings, calendar activity, and shared documents.",
        permissions: ["Create and update accessible tasks", "Comment on task discussions", "Work with assigned documents"]
      };
    case "VOLUNTEER":
      return {
        description: "A focused volunteer workspace for assigned tasks, meetings, calendar commitments, and documents shared with you.",
        permissions: ["View assigned work", "Comment on accessible tasks", "Upload task attachments when allowed"]
      };
    case "BENEFICIARY":
      return {
        description: "Your restricted personal portal for assigned programs, workshops, meetings, resources, documents, and mentor support.",
        permissions: ["View assigned programs", "Track personal progress", "Access invited workshops, meetings, and documents"]
      };
    case "SPONSOR_VIEWER":
    default:
      return {
        description: "Sponsor-facing transparency for approved programs, reports, signed documents, milestones, and impact summaries.",
        permissions: ["View approved programs", "Review sponsor-visible reports", "No access to raw beneficiary or internal operations data"]
      };
  }
}

function roleQuickLinks(role?: UserRole) {
  switch (role) {
    case "SUPER_ADMIN":
      return [
        { href: "/users", label: "Manage Users" },
        { href: "/governance", label: "Executive Governance" },
        { href: "/reports", label: "Reports" },
        { href: "/settings", label: "Settings" }
      ];
    case "EXECUTIVE":
      return [
        { href: "/governance", label: "Governance" },
        { href: "/approvals", label: "Approvals" },
        { href: "/documents", label: "Documents" },
        { href: "/reports", label: "Reports" }
      ];
    case "PROJECT_MANAGER":
      return [
        { href: "/programs", label: "Programs" },
        { href: "/projects", label: "Projects" },
        { href: "/tasks", label: "Tasks" },
        { href: "/approvals", label: "Approvals" }
      ];
    case "TEAM_MEMBER":
      return [
        { href: "/projects", label: "Projects" },
        { href: "/tasks", label: "Tasks" },
        { href: "/meetings", label: "Meetings" },
        { href: "/documents", label: "Documents" }
      ];
    case "VOLUNTEER":
      return [
        { href: "/tasks", label: "Assigned Tasks" },
        { href: "/meetings", label: "Meetings" },
        { href: "/calendar", label: "Calendar" },
        { href: "/documents", label: "Documents" }
      ];
    case "BENEFICIARY":
      return [
        { href: "/beneficiary-portal", label: "My Portal" },
        { href: "/beneficiary-portal/programs", label: "My Programs" },
        { href: "/workshops", label: "Workshops" },
        { href: "/beneficiary-portal/documents", label: "My Documents" },
        { href: "/settings", label: "Settings" }
      ];
    case "SPONSOR_VIEWER":
    default:
      return [
        { href: "/sponsors", label: "Sponsor Dashboard" },
        { href: "/reports", label: "Approved Reports" },
        { href: "/documents", label: "Approved Documents" },
        { href: "/settings", label: "Settings" }
      ];
  }
}
