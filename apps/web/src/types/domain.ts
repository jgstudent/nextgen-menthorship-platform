export type UserRole = "SUPER_ADMIN" | "EXECUTIVE" | "PROJECT_MANAGER" | "TEAM_MEMBER" | "VOLUNTEER" | "BENEFICIARY" | "SPONSOR_VIEWER";
export type UserStatus = "ACTIVE" | "INVITED" | "SUSPENDED" | "DISABLED" | "PENDING_APPROVAL";
export type ProjectStatus = "PLANNING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "WAITING" | "BLOCKED" | "COMPLETED" | "APPROVED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type MeetingAttendeeRole = "HOST" | "REQUIRED" | "OPTIONAL";
export type MeetingResponseStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE";
export type MeetingActionItemStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CONVERTED_TO_TASK";
export type ProgramStatus = "PLANNING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
export type ProgramVisibility = "INTERNAL" | "SPONSOR_VISIBLE" | "PUBLIC_SUMMARY";
export type BeneficiaryProgramStatus = "APPLICANT" | "ACTIVE" | "COMPLETED" | "SUSPENDED" | "ALUMNI";
export type EnrollmentStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "DROPPED";
export type WorkshopVisibility = "INTERNAL" | "SPONSOR_VISIBLE" | "BENEFICIARY_VISIBLE" | "PUBLIC_SUMMARY";
export type AttendanceStatus = "REGISTERED" | "ATTENDED" | "MISSED" | "EXCUSED";
export type ApprovalType = "PROGRAM_APPROVAL" | "PROJECT_APPROVAL" | "TASK_APPROVAL" | "FILE_APPROVAL" | "BENEFICIARY_APPROVAL" | "WORKSHOP_APPROVAL" | "SPONSOR_VISIBILITY_APPROVAL" | "BUDGET_APPROVAL" | "GENERAL_REQUEST";
export type ApprovalStatus = "DRAFT" | "PENDING_REVIEW" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "CANCELLED";
export type ApprovalPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type ApprovalAction = "CREATED" | "UPDATED" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "CANCELLED" | "REOPENED" | "COMMENTED" | "DELETED";
export type DocumentStatus = "DRAFT" | "APPROVAL_REQUIRED" | "READY_FOR_SIGNATURE" | "SENT_FOR_SIGNATURE" | "PARTIALLY_SIGNED" | "COMPLETED" | "VOIDED" | "DECLINED";
export type SubmissionStatus = "DRAFT" | "SENT" | "IN_PROGRESS" | "COMPLETED" | "DECLINED" | "VOIDED" | "ERROR";
export type SignerStatus = "PENDING" | "SENT" | "VIEWED" | "SIGNED" | "DECLINED" | "VOIDED";
export type PolicyStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "ARCHIVED";
export type ResolutionStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status?: UserStatus;
  isActive?: boolean;
  avatarUrl?: string;
  memberships?: Array<{ id: string; role: UserRole; workspace: Workspace }>;
  programAssignments?: Array<{ id: string; role: UserRole; program: Program }>;
  projectAssignments?: Array<{ id: string; role: UserRole; project: Project }>;
  beneficiaryProfile?: Beneficiary;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  displayName?: string;
  supportEmail?: string;
  logoUrl?: string;
  websiteUrl?: string;
  missionSummary?: string;
  enabledAddOns?: string[];
  workspaces?: Workspace[];
};

export type Workspace = {
  id: string;
  organizationId?: string;
  name: string;
  slug: string;
  description?: string;
  _count?: { projects: number; members: number };
};

export type Project = {
  id: string;
  organizationId?: string;
  workspaceId: string;
  programId?: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  workspace?: Workspace;
  program?: Program;
  boards?: Board[];
};

export type BoardGroup = { id: string; name: string; color?: string; order: number };
export type BoardColumn = { id: string; name: string; type: string; order: number };

export type Task = {
  id: string;
  boardId: string;
  groupId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  archivedAt?: string;
  assignee?: User;
  board?: Board;
  comments?: Comment[];
  files?: FileAttachment[];
};

export type Comment = {
  id: string;
  itemId: string;
  body: string;
  createdAt: string;
  author?: User;
  files?: FileAttachment[];
};

export type FileAttachment = {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  bucket: string;
  objectKey: string;
  url?: string;
  downloadUrl?: string;
  uploadedById: string;
  taskId?: string;
  projectId?: string;
  commentId?: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: User;
};

export type ApprovalComment = {
  id: string;
  approvalId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
};

export type ApprovalHistory = {
  id: string;
  approvalId: string;
  action: ApprovalAction;
  actorId: string;
  previousStatus?: ApprovalStatus;
  newStatus?: ApprovalStatus;
  notes?: string;
  timestamp: string;
  actor?: User;
};

export type Approval = {
  id: string;
  title: string;
  description?: string;
  type: ApprovalType;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  requestedById: string;
  assignedApproverId?: string;
  workspaceId: string;
  programId?: string;
  projectId?: string;
  taskId?: string;
  beneficiaryId?: string;
  workshopId?: string;
  fileId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  requestedBy?: User;
  assignedApprover?: User;
  workspace?: Workspace;
  program?: Program;
  project?: Project;
  task?: Task;
  beneficiary?: Beneficiary;
  workshop?: Workshop;
  file?: FileAttachment;
  comments?: ApprovalComment[];
  history?: ApprovalHistory[];
};

export type SubmissionSigner = {
  id: string;
  submissionId: string;
  userId?: string;
  email: string;
  name: string;
  role?: string;
  status: SignerStatus;
  docusealSubmitterId?: string;
  signingUrl?: string;
  embeddedUrl?: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
};

export type DocumentSubmission = {
  id: string;
  documentId: string;
  requestedById: string;
  status: SubmissionStatus;
  docusealSubmissionId?: string;
  docusealTemplateId?: string;
  sentAt?: string;
  completedAt?: string;
  signedDocumentUrl?: string;
  auditTrailUrl?: string;
  createdAt: string;
  updatedAt: string;
  requestedBy?: User;
  signers?: SubmissionSigner[];
};

export type DocumentRecord = {
  id: string;
  title: string;
  description?: string;
  status: DocumentStatus;
  createdById: string;
  workspaceId: string;
  programId?: string;
  projectId?: string;
  taskId?: string;
  beneficiaryId?: string;
  workshopId?: string;
  approvalId?: string;
  fileId?: string;
  docusealTemplateId?: string;
  signedDocumentUrl?: string;
  auditTrailUrl?: string;
  sponsorVisible: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
  workspace?: Workspace;
  program?: Program;
  project?: Project;
  task?: Task;
  beneficiary?: Beneficiary;
  workshop?: Workshop;
  approval?: Approval;
  file?: FileAttachment;
  submissions?: DocumentSubmission[];
};

export type Policy = {
  id: string;
  title: string;
  description?: string;
  status: PolicyStatus;
  version: string;
  workspaceId: string;
  createdById: string;
  approvedById?: string;
  effectiveDate?: string;
  linkedFileId?: string;
  createdAt: string;
  updatedAt: string;
  workspace?: Workspace;
  createdBy?: User;
  approvedBy?: User;
  linkedFile?: FileAttachment;
};

export type BoardResolution = {
  id: string;
  title: string;
  description?: string;
  status: ResolutionStatus;
  resolutionNumber?: string;
  workspaceId: string;
  meetingId?: string;
  approvalId?: string;
  documentId?: string;
  createdById: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  workspace?: Workspace;
  meeting?: Meeting;
  approval?: Approval;
  document?: DocumentRecord;
  createdBy?: User;
};

export type Board = {
  id: string;
  name: string;
  description?: string;
  project?: Project;
  groups: BoardGroup[];
  columns: BoardColumn[];
  items: Task[];
};

export type MeetingAttendee = {
  id: string;
  meetingId: string;
  userId: string;
  role: MeetingAttendeeRole;
  responseStatus: MeetingResponseStatus;
  createdAt: string;
  user?: User;
};

export type MeetingActionItem = {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  assignedToId?: string;
  dueDate?: string;
  status: MeetingActionItemStatus;
  convertedTaskId?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: User;
  convertedTask?: Task;
};

export type Meeting = {
  id: string;
  organizationId: string;
  workspaceId?: string;
  projectId?: string;
  title: string;
  description?: string;
  location?: string;
  videoUrl?: string;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  agenda?: string;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  workspace?: Workspace;
  project?: Project;
  createdBy?: User;
  attendees?: MeetingAttendee[];
  actionItems?: MeetingActionItem[];
};

export type Program = {
  id: string;
  name: string;
  description?: string;
  category: string;
  visibility: ProgramVisibility;
  status: ProgramStatus;
  ownerId?: string;
  workspaceId: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  workspace?: Workspace;
  projects?: Project[];
  workshops?: Workshop[];
  enrollments?: ProgramEnrollment[];
};

export type ProgramEnrollment = {
  id: string;
  beneficiaryId: string;
  programId: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
  progressPercent: number;
  notes?: string;
  assignedMentorId?: string;
  createdAt: string;
  updatedAt: string;
  program?: Program;
  beneficiary?: Beneficiary;
  assignedMentor?: User;
};

export type Beneficiary = {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  country: string;
  city?: string;
  programStatus: BeneficiaryProgramStatus;
  notes?: string;
  assignedMentorId?: string;
  onboardingDate: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  assignedMentor?: User;
  enrollments?: ProgramEnrollment[];
  projectAssignments?: Array<{ id: string; project: Project }>;
  workshopEnrollments?: WorkshopEnrollment[];
};

export type Workshop = {
  id: string;
  title: string;
  description?: string;
  programId: string;
  instructorId?: string;
  location?: string;
  virtualMeetingUrl?: string;
  startTime: string;
  endTime: string;
  capacity?: number;
  visibility: WorkshopVisibility;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  program?: Program;
  instructor?: User;
  enrollments?: WorkshopEnrollment[];
};

export type WorkshopEnrollment = {
  id: string;
  workshopId: string;
  beneficiaryId?: string;
  userId?: string;
  status: EnrollmentStatus;
  attendance?: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
  workshop?: Workshop;
  beneficiary?: Beneficiary;
  user?: User;
};
