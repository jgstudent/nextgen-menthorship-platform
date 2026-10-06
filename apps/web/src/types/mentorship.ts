export type MentorshipFoundation = {
  phase: 1;
  status: "PARTICIPANT_INTAKE";
  enrollmentOpen: false;
};

export type MentorshipProgramStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
export type MentorshipMeetingMode = "VIRTUAL" | "IN_PERSON" | "HYBRID";
export type MentorshipCohortStatus = "DRAFT" | "APPLICATIONS_OPEN" | "APPLICATIONS_CLOSED" | "MATCHING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
export type MentorshipParticipantRole = "MENTOR" | "TUTOR" | "MENTEE";
export type MentorshipApplicationStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "NEEDS_INFORMATION" | "APPROVED" | "ELIGIBLE" | "INELIGIBLE" | "REJECTED" | "WITHDRAWN";
export type MentorshipParticipantStatus = "MATCHING_POOL" | "UNAVAILABLE" | "WAITLISTED" | "ACTIVE" | "COMPLETED" | "WITHDRAWN";
export type MentorshipGoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type MentorshipSessionStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type MentorshipAttendanceStatus = "PENDING" | "ATTENDED" | "ABSENT" | "EXCUSED";
export type MentorshipResourceType = "LINK" | "DOCUMENT" | "VIDEO" | "ARTICLE" | "TEMPLATE" | "OTHER";
export type MentorshipResourceAssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";
export type MentorshipServiceHourStatus = "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
export type MentorshipStipendStatus = "PENDING_REVIEW" | "ELIGIBLE" | "INELIGIBLE" | "APPROVED" | "PAID";

export type MatchingWeights = { academicAlignment: number; supportNeeds: number; careerAlignment: number; scheduleOverlap: number; language: number; background: number; otherPreferences: number };

export type MentorshipCohort = {
  id: string; programId: string; name: string; code: string; description?: string; status: MentorshipCohortStatus;
  applicationOpenDate?: string; applicationCloseDate?: string; mentorApplicationOpenDate?: string; mentorApplicationCloseDate?: string; menteeApplicationOpenDate?: string; menteeApplicationCloseDate?: string;
  programStartDate: string; programEndDate: string; targetMentors?: number; maximumMentors?: number; targetTutors?: number; maximumTutors?: number; targetMentees?: number; maximumMentees?: number; waitlistEnabled: boolean;
  mentorEligibility: Record<string, unknown>; tutorEligibility: Record<string, unknown>; menteeEligibility: Record<string, unknown>; minimumSessions: number; expectedHours: number; sessionFrequency?: string;
  matchingEnabled: boolean; recommendationCount: number; adminApprovalRequired: true; matchingWeights: MatchingWeights;
  stipendEnabled: boolean; stipendAmountCents?: number; stipendPaymentModel?: string; stipendRequirements?: string[];
};

export type MentorshipProgram = {
  id: string; organizationId: string; ownerId?: string; name: string; code: string; description?: string; status: MentorshipProgramStatus; programType: string;
  defaultDuration?: string; defaultMeetingMode: MentorshipMeetingMode; maximumParticipants?: number; timeZone: string; applicationsEnabled: boolean; matchingEnabled: boolean; stipendsEnabled: boolean;
  publicApplicationsEnabled: boolean; publicApplicationToken?: string; inquiryEmail?: string;
  organization: { id: string; name: string; displayName?: string; supportEmail?: string; logoUrl?: string; enabledAddOns?: string[] }; cohorts: MentorshipCohort[];
};

export type PublicMentorshipProgram = {
  organization: { name: string; logoUrl?: string };
  program: { id: string; name: string; description?: string; programType: string; timeZone: string; defaultMeetingMode: MentorshipMeetingMode };
  cohorts: Array<Pick<MentorshipCohort, "id" | "name" | "code" | "programStartDate" | "programEndDate" | "mentorEligibility" | "tutorEligibility" | "menteeEligibility"> & { availableRoles: MentorshipParticipantRole[] }>;
};

export type MentorshipMatchStatus = "PROPOSED" | "APPROVED" | "REJECTED" | "ACTIVE" | "ENDED";
export type MentorshipMatch = {
  id: string; programId: string; cohortId: string; status: MentorshipMatchStatus; score: number; scoreBreakdown: Record<string, number>; notes?: string;
  cohort: Pick<MentorshipCohort, "id" | "name" | "code">;
  mentee: MentorshipParticipant & { application: MentorshipApplication };
  provider: MentorshipParticipant & { application: MentorshipApplication };
  approvedBy?: { id: string; firstName: string; lastName: string };
};

export type MentorshipRelationship = {
  id: string; matchId: string; programId: string; cohortId: string; status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ENDED"; startDate: string; endDate?: string;
  cohort: Pick<MentorshipCohort, "id" | "name" | "code" | "minimumSessions" | "expectedHours">;
  mentee: MentorshipParticipant & { application: MentorshipApplication };
  provider: MentorshipParticipant & { application: MentorshipApplication };
  match: { id: string; score: number; approvedAt?: string };
  goals: MentorshipGoal[];
  sessions: MentorshipSession[];
  progressUpdates: MentorshipProgressUpdate[];
};

export type MentorshipGoal = { id: string; relationshipId: string; title: string; description?: string; status: MentorshipGoalStatus; progressPercent: number; targetDate?: string; completedAt?: string; createdAt: string; updatedAt: string };
export type MentorshipSession = { id: string; relationshipId: string; title: string; scheduledStart: string; scheduledEnd: string; meetingMode: MentorshipMeetingMode; location?: string; videoUrl?: string; agenda?: string; notes?: string; status: MentorshipSessionStatus; providerAttendance: MentorshipAttendanceStatus; menteeAttendance: MentorshipAttendanceStatus; completedMinutes: number; createdAt: string; updatedAt: string };
export type MentorshipProgressUpdate = { id: string; relationshipId: string; summary: string; challenges?: string; nextSteps?: string; progressRating?: number; createdAt: string; author: { id: string; firstName: string; lastName: string } };

export type MentorshipResourceAssignment = {
  id: string; resourceId: string; relationshipId: string; goalId?: string; sessionId?: string; assigneeParticipantId: string;
  status: MentorshipResourceAssignmentStatus; dueDate?: string; notes?: string; completionNotes?: string; completedAt?: string; createdAt: string; updatedAt: string;
  assignee?: MentorshipParticipant & { application: Pick<MentorshipApplication, "firstName" | "lastName" | "email"> };
  relationship?: { id: string; cohort?: Pick<MentorshipCohort, "id" | "name" | "code"> };
  goal?: Pick<MentorshipGoal, "id" | "title">;
  session?: Pick<MentorshipSession, "id" | "title" | "scheduledStart">;
  assignedBy?: { id: string; firstName: string; lastName: string };
  resource?: Pick<MentorshipResource, "id" | "title" | "description" | "type" | "url" | "tags">;
};

export type MentorshipResource = {
  id: string; programId: string; title: string; description?: string; type: MentorshipResourceType; url: string; tags: string[]; archivedAt?: string; createdAt: string; updatedAt: string;
  createdBy?: { id: string; firstName: string; lastName: string };
  assignments: MentorshipResourceAssignment[];
};

export type MentorshipServiceHour = {
  id: string; programId: string; cohortId: string; participantId: string; relationshipId: string; sessionId?: string;
  serviceDate: string; minutes: number; activity: string; description?: string; evidenceUrl?: string; status: MentorshipServiceHourStatus;
  reviewNotes?: string; reviewedAt?: string; createdAt: string; updatedAt: string;
  cohort?: Pick<MentorshipCohort, "id" | "name" | "code">;
  participant?: MentorshipParticipant & { application: Pick<MentorshipApplication, "firstName" | "lastName" | "email"> };
  session?: Pick<MentorshipSession, "id" | "title" | "scheduledStart" | "status">;
  submittedBy?: { id: string; firstName: string; lastName: string };
  reviewedBy?: { id: string; firstName: string; lastName: string };
};

export type MentorshipStipendDecision = {
  id: string; participantId: string; status: MentorshipStipendStatus; verifiedMinutesAtDecision: number; notes?: string; decidedAt: string; paidAt?: string;
  reviewedBy?: { id: string; firstName: string; lastName: string };
};

export type MentorshipServiceHourReport = {
  summary: { submitted: number; approved: number; rejected: number; verifiedHours: number; stipendEligible: number };
  entries: MentorshipServiceHour[];
  eligibility: Array<{
    participantId: string; role: MentorshipParticipantRole; participant: Pick<MentorshipApplication, "firstName" | "lastName" | "email">;
    cohort: Pick<MentorshipCohort, "id" | "name" | "code" | "expectedHours" | "stipendEnabled" | "stipendAmountCents" | "stipendPaymentModel">;
    verifiedMinutes: number; verifiedHours: number; requiredHours: number; hoursRequirementMet: boolean; stipendEnabled: boolean; requirements: string[];
    decision?: MentorshipStipendDecision;
  }>;
};

export type MentorshipPortal = {
  participants: Array<{
    id: string; role: MentorshipParticipantRole; status: MentorshipParticipantStatus; availableForMatch: boolean;
    application: { firstName: string; lastName: string; email: string; timeZone: string; availability: Record<string, unknown>; meetingMode?: MentorshipMeetingMode; hoursPerWeek?: number };
    program: { id: string; name: string; code: string; description?: string; timeZone: string };
    cohort: Pick<MentorshipCohort, "id" | "name" | "code" | "status" | "minimumSessions" | "expectedHours" | "programStartDate" | "programEndDate">;
    resources: MentorshipResourceAssignment[];
    serviceHours: MentorshipServiceHour[];
    stipendDecision?: MentorshipStipendDecision;
    relationships: Array<{
      id: string; status: MentorshipRelationship["status"]; startDate: string; endDate?: string;
      cohort: Pick<MentorshipCohort, "id" | "name" | "code" | "minimumSessions" | "expectedHours" | "programStartDate" | "programEndDate">;
      counterpart: { role: MentorshipParticipantRole; name: string; email: string };
      goals: MentorshipGoal[]; sessions: MentorshipSession[]; progressUpdates: MentorshipProgressUpdate[];
    }>;
  }>;
};

export type MentorshipMonitoringMetrics = {
  relationships: number; activeRelationships: number; administrativelyCompleted: number; targetComplete: number; completionRate: number;
  completedSessions: number; completedHours: number; attendanceRate: number; goalProgressPercent: number; completedGoals: number; totalGoals: number;
  overdueSessions: number; inactiveRelationships: number; noShows: number;
};

export type MentorshipMonitoringReport = {
  generatedAt: string; inactivityThresholdDays: number; program: { id: string; name: string; code: string };
  summary: MentorshipMonitoringMetrics & { cohorts: number };
  cohorts: Array<MentorshipMonitoringMetrics & Pick<MentorshipCohort, "id" | "name" | "code" | "status" | "programStartDate" | "programEndDate" | "minimumSessions" | "expectedHours">>;
  relationships: Array<{
    id: string; cohortId: string; cohortName: string; status: MentorshipRelationship["status"]; providerRole: MentorshipParticipantRole;
    providerName: string; providerEmail: string; menteeName: string; menteeEmail: string; completedSessions: number; requiredSessions: number;
    completedHours: number; expectedHours: number; attendanceRate: number; completedGoals: number; totalGoals: number; goalProgressPercent: number;
    overdueSessions: number; lastActivityAt: string; inactive: boolean; targetComplete: boolean;
  }>;
};

export type MentorshipParticipant = {
  id: string; applicationId: string; programId: string; cohortId: string; userId?: string; role: MentorshipParticipantRole; status: MentorshipParticipantStatus; availableForMatch: boolean; approvedAt: string;
};

export type MentorshipRosterParticipant = MentorshipParticipant & {
  cohort: Pick<MentorshipCohort, "id" | "name" | "code">;
  application: MentorshipApplication;
};

export type MentorshipApplication = {
  id: string; programId: string; cohortId: string; applicantUserId?: string; role: MentorshipParticipantRole; source: "SELF_SERVICE" | "INVITATION" | "ADMIN_CREATED"; status: MentorshipApplicationStatus;
  firstName: string; lastName: string; email: string; phone?: string; timeZone: string; languages: string[]; locationRegion?: string; institution?: string; degreeProgram?: string; major?: string; minor?: string; academicLevel?: string; graduationYear?: number; gpa?: number;
  disciplines: string[]; expertise: Record<string, string>; mentoringCapabilities: string[]; supportNeeds: string[]; careerInterests: string[]; availability: Record<string, unknown>; meetingMode?: MentorshipMeetingMode; hoursPerWeek?: number; maximumMentees?: number;
  primaryObjective?: string; goals?: string; currentChallenge?: string; motivation?: string; experience?: string; consentItems: Record<string, boolean>; reviewNotes?: string; submittedAt?: string; reviewedAt?: string; createdAt: string; updatedAt: string;
  cohort: Pick<MentorshipCohort, "id" | "name" | "code" | "status">; participant?: MentorshipParticipant;
};
