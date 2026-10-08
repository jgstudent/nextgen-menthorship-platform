import type { ComponentType } from "react";
import { BarChart3, Blocks, BookOpen, BriefcaseBusiness, Building2, CalendarDays, CheckSquare, ClipboardCheck, FileSignature, FolderKanban, GraduationCap, HandHeart, HeartHandshake, Home, Landmark, LayoutDashboard, Presentation, Settings, ShieldCheck, UserCog, Video } from "lucide-react";
import type { UserRole } from "@/types/domain";
import { canPreviewMentorship } from "@/lib/permissions";

export type NavigationItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles: UserRole[];
  exact?: boolean;
};

export type NavigationGroup = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  items: NavigationItem[];
};

const everyone: UserRole[] = ["SUPER_ADMIN", "EXECUTIVE", "PROJECT_MANAGER", "TEAM_MEMBER", "VOLUNTEER", "BENEFICIARY", "SPONSOR_VIEWER"];
const executives: UserRole[] = ["SUPER_ADMIN", "EXECUTIVE"];
const operations: UserRole[] = ["SUPER_ADMIN", "EXECUTIVE", "PROJECT_MANAGER"];
const collaborators: UserRole[] = ["SUPER_ADMIN", "EXECUTIVE", "PROJECT_MANAGER", "TEAM_MEMBER"];
const assignedWork: UserRole[] = ["SUPER_ADMIN", "EXECUTIVE", "PROJECT_MANAGER", "TEAM_MEMBER", "VOLUNTEER"];

const item = (href: string, label: string, icon: ComponentType<{ className?: string }>, roles: UserRole[], exact?: boolean): NavigationItem => ({ href, label, icon, roles, exact });
const group = (label: string, icon: ComponentType<{ className?: string }>, items: NavigationItem[]): NavigationGroup => ({ label, icon, items });

const adminGroups = [
  group("Home", LayoutDashboard, [item("/dashboard", "Dashboard", LayoutDashboard, everyone), item("/app-integrations", "App Integrations", Blocks, executives)]),
  group("Operations", BriefcaseBusiness, [
    item("/workspaces", "Workspaces", Home, operations),
    item("/projects", "Projects", BriefcaseBusiness, collaborators),
    item("/tasks", "Tasks", CheckSquare, assignedWork),
    item("/calendar", "Calendar", CalendarDays, assignedWork),
    item("/meetings", "Meetings", Video, assignedWork)
  ]),
  group("Programs", BookOpen, [
    item("/programs", "Programs", BookOpen, operations, true),
    item("/programs/mentorship", "Mentorship", GraduationCap, executives),
    item("/my-mentorship", "My Mentorship", HeartHandshake, executives),
    item("/workshops", "Workshops", Presentation, operations),
    item("/beneficiaries", "Beneficiaries", ShieldCheck, operations)
  ]),
  group("Governance", Landmark, [
    item("/boards", "Boards", FolderKanban, operations),
    item("/approvals", "Approvals", ClipboardCheck, collaborators),
    item("/documents", "Documents", FileSignature, ["SUPER_ADMIN", "EXECUTIVE", "PROJECT_MANAGER", "TEAM_MEMBER"]),
    item("/governance", "Executive Governance", Landmark, executives)
  ]),
  group("Administration", Building2, [
    item("/users", "Users", UserCog, ["SUPER_ADMIN"]),
    item("/reports", "Reports", BarChart3, ["SUPER_ADMIN"]),
    item("/settings", "Settings", Settings, ["SUPER_ADMIN"])
  ])
];

const executiveGroups = [
  group("Home", LayoutDashboard, [item("/dashboard", "Dashboard", LayoutDashboard, ["EXECUTIVE"]), item("/app-integrations", "App Integrations", Blocks, ["EXECUTIVE"])]),
  group("Operations", BriefcaseBusiness, [
    item("/workspaces", "Workspaces", Home, ["EXECUTIVE"]),
    item("/projects", "Projects", BriefcaseBusiness, ["EXECUTIVE"]),
    item("/tasks", "Tasks", CheckSquare, ["EXECUTIVE"]),
    item("/calendar", "Calendar", CalendarDays, ["EXECUTIVE"]),
    item("/meetings", "Meetings", Video, ["EXECUTIVE"])
  ]),
  group("Programs", BookOpen, [
    item("/programs", "Programs", BookOpen, ["EXECUTIVE"], true),
    item("/programs/mentorship", "Mentorship", GraduationCap, executives),
    item("/my-mentorship", "My Mentorship", HeartHandshake, ["EXECUTIVE"]),
    item("/workshops", "Workshops", Presentation, ["EXECUTIVE"]),
    item("/beneficiaries", "Beneficiaries", ShieldCheck, ["EXECUTIVE"])
  ]),
  group("Governance", Landmark, [
    item("/boards", "Boards", FolderKanban, ["EXECUTIVE"]),
    item("/approvals", "Approvals", ClipboardCheck, ["EXECUTIVE"]),
    item("/documents", "Documents", FileSignature, ["EXECUTIVE"]),
    item("/governance", "Executive Governance", Landmark, ["EXECUTIVE"])
  ]),
  group("Account", Building2, [
    item("/reports", "Reports", BarChart3, ["EXECUTIVE"]),
    item("/settings", "Settings", Settings, ["EXECUTIVE"])
  ])
];

const projectManagerGroups = [
  group("Home", LayoutDashboard, [item("/dashboard", "Dashboard", LayoutDashboard, ["PROJECT_MANAGER"])]),
  group("Operations", BriefcaseBusiness, [
    item("/workspaces", "Workspaces", Home, ["PROJECT_MANAGER"]),
    item("/projects", "Projects", BriefcaseBusiness, ["PROJECT_MANAGER"]),
    item("/tasks", "Tasks", CheckSquare, ["PROJECT_MANAGER"]),
    item("/calendar", "Calendar", CalendarDays, ["PROJECT_MANAGER"]),
    item("/meetings", "Meetings", Video, ["PROJECT_MANAGER"])
  ]),
  group("Programs", BookOpen, [
    item("/programs", "Programs", BookOpen, ["PROJECT_MANAGER"]),
    item("/my-mentorship", "My Mentorship", HeartHandshake, ["PROJECT_MANAGER"]),
    item("/workshops", "Workshops", Presentation, ["PROJECT_MANAGER"]),
    item("/beneficiaries", "Beneficiaries", ShieldCheck, ["PROJECT_MANAGER"])
  ]),
  group("Documents", FileSignature, [item("/documents", "Documents", FileSignature, ["PROJECT_MANAGER"])]),
  group("Account", Building2, [item("/settings", "Settings", Settings, ["PROJECT_MANAGER"])])
];

const teamMemberGroups = [
  group("Home", LayoutDashboard, [item("/dashboard", "Dashboard", LayoutDashboard, everyone)]),
  group("Work", BriefcaseBusiness, [
    item("/projects", "Projects", BriefcaseBusiness, collaborators),
    item("/tasks", "Tasks", CheckSquare, assignedWork),
    item("/calendar", "Calendar", CalendarDays, assignedWork),
    item("/meetings", "Meetings", Video, assignedWork),
    item("/documents", "Documents", FileSignature, ["TEAM_MEMBER"]),
    item("/my-mentorship", "My Mentorship", HeartHandshake, ["TEAM_MEMBER"])
  ]),
  group("Account", Building2, [item("/settings", "Settings", Settings, everyone)])
];

const volunteerGroups = [
  group("Home", LayoutDashboard, [item("/dashboard", "Dashboard", LayoutDashboard, everyone)]),
  group("Assigned Work", CheckSquare, [
    item("/tasks", "Assigned Tasks", CheckSquare, ["VOLUNTEER"]),
    item("/meetings", "Meetings", Video, ["VOLUNTEER"]),
    item("/calendar", "Calendar", CalendarDays, ["VOLUNTEER"]),
    item("/documents", "Documents", FileSignature, ["VOLUNTEER"]),
    item("/my-mentorship", "My Mentorship", HeartHandshake, ["VOLUNTEER"])
  ]),
  group("Account", Building2, [item("/settings", "Settings", Settings, everyone)])
];

const beneficiaryGroups = [
  group("Home", GraduationCap, [
    item("/beneficiary-portal", "My Portal", GraduationCap, ["BENEFICIARY"]),
    item("/beneficiary-portal/programs", "My Programs", BookOpen, ["BENEFICIARY"]),
    item("/my-mentorship", "My Mentorship", HeartHandshake, ["BENEFICIARY"])
  ]),
  group("My Access", CalendarDays, [
    item("/workshops", "Workshops", Presentation, ["BENEFICIARY"]),
    item("/meetings", "Meetings", Video, ["BENEFICIARY"]),
    item("/beneficiary-portal/documents", "My Documents", FileSignature, ["BENEFICIARY"]),
    item("/settings", "Settings", Settings, everyone)
  ])
];

const sponsorGroups = [
  group("Home", HandHeart, [item("/sponsors", "Sponsor Dashboard", HandHeart, ["SPONSOR_VIEWER"])]),
  group("Transparency", BarChart3, [
    item("/programs", "Sponsored Programs", BookOpen, ["SPONSOR_VIEWER"]),
    item("/reports", "Approved Reports", BarChart3, ["SPONSOR_VIEWER"]),
    item("/documents", "Approved Documents", FileSignature, ["SPONSOR_VIEWER"]),
    item("/settings", "Settings", Settings, everyone)
  ])
];

export const navigationGroups: NavigationGroup[] = adminGroups;

export function visibleNavigationGroups(role?: UserRole, enabledAddOns: string[] = []) {
  const addOnRoutes = new Set(["/programs/mentorship", "/my-mentorship"]);
  return groupsForRole(role).map((navGroup) => ({ ...navGroup, items: navGroup.items.filter((navItem) => !addOnRoutes.has(navItem.href) || enabledAddOns.includes("MENTORSHIP")) })).filter((navGroup) => navGroup.items.length > 0);
}

export function canAccessPath(pathname: string | null | undefined, role?: UserRole, enabledAddOns: string[] = []) {
  if (pathname?.startsWith("/apply/mentorship/") || pathname?.startsWith("/activate/")) return true;
  if (pathname === "/programs/mentorship" || pathname?.startsWith("/programs/mentorship/")) {
    return enabledAddOns.includes("MENTORSHIP") && canPreviewMentorship(role);
  }
  if (pathname === "/my-mentorship" || pathname?.startsWith("/my-mentorship/")) {
    return enabledAddOns.includes("MENTORSHIP") && Boolean(role && role !== "SPONSOR_VIEWER");
  }
  if (!role || !pathname || ["/login", "/register", "/forgot-password"].includes(pathname) || pathname === "/") {
    return true;
  }
  if (role === "SUPER_ADMIN") {
    return true;
  }
  return groupsForRole(role).flatMap((navGroup) => navGroup.items).some((navItem) => isRouteMatch(pathname, navItem));
}

export function isRouteMatch(pathname: string, navItem: NavigationItem) {
  if (navItem.exact) {
    return pathname === navItem.href;
  }
  return pathname === navItem.href || pathname.startsWith(`${navItem.href}/`);
}

function groupsForRole(role?: UserRole): NavigationGroup[] {
  switch (role) {
    case "BENEFICIARY":
      return beneficiaryGroups;
    case "VOLUNTEER":
      return volunteerGroups;
    case "SPONSOR_VIEWER":
      return sponsorGroups;
    case "TEAM_MEMBER":
      return teamMemberGroups;
    case "SUPER_ADMIN":
      return adminGroups;
    case "EXECUTIVE":
      return executiveGroups;
    case "PROJECT_MANAGER":
      return projectManagerGroups;
    default:
      return [];
  }
}
