import type { UserRole } from "@/types/domain";

// Temporary administrative preview, not a program membership permission.
export function canPreviewMentorship(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE";
}

export function canManageProjects(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canManagePrograms(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canManageBeneficiaries(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canManageWorkshops(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canManageUsers(role?: UserRole) {
  return role === "SUPER_ADMIN";
}

export function canCreateApprovals(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER" || role === "TEAM_MEMBER";
}

export function canReviewApprovals(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canCreateDocuments(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canSendDocuments(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canAssignSuperAdmin(role?: UserRole) {
  return role === "SUPER_ADMIN";
}

export function canCreateTasks(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "PROJECT_MANAGER" || role === "TEAM_MEMBER";
}

export function canEditTasks(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "PROJECT_MANAGER" || role === "TEAM_MEMBER";
}

export function canDeleteTasks(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canArchivePrograms(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canArchiveProjects(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canArchiveWorkshops(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canArchiveTasks(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canUploadFiles(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "PROJECT_MANAGER" || role === "TEAM_MEMBER" || role === "VOLUNTEER";
}

export function canManageMeetings(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER";
}

export function canCreateActionItems(role?: UserRole) {
  return role === "SUPER_ADMIN" || role === "EXECUTIVE" || role === "PROJECT_MANAGER" || role === "TEAM_MEMBER" || role === "VOLUNTEER";
}

export function isReadOnlyRole(role?: UserRole) {
  return role === "SPONSOR_VIEWER";
}

export function isBeneficiaryRole(role?: UserRole) {
  return role === "BENEFICIARY";
}

export function isSponsorRole(role?: UserRole) {
  return role === "SPONSOR_VIEWER";
}

export function roleLabel(role?: UserRole) {
  return (role ?? "SPONSOR_VIEWER")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function homePathForRole(role?: UserRole) {
  return canPreviewMentorship(role) ? "/programs/mentorship" : "/my-mentorship";
}
