# NextGen Mentorship Platform

## Purpose and scope

An integrated program within the independently copied NextGen portal, connecting college juniors, seniors, graduate students, and recent graduates with students needing academic, career, or college-transition support. Phase 1A provides program/cohort configuration and Phase 1B provides protected administrative participant intake and eligibility review. Public enrollment and matching remain closed.

Read [architecture discovery](ARCHITECTURE_DISCOVERY.md), [local development](LOCAL_DEVELOPMENT.md), and [validation](VALIDATION.md) before extending the module.

## Principles and integration

- Reuse the portal's identity, REST API, database, routing, role guards, visual components, and deployment approach.
- One user can participate in multiple programs. A global role does not define their program participation.
- Keep business rules in Nest services; both web and future mobile clients consume the same backend.
- Keep student records private by default. Program visibility and authentication alone do not grant participant access.
- Build the shared Resource Center at portal level, with relationship-specific assignments, not a mentorship-only catalog.
- Prefer incremental changes in the existing modular monolith. Do not add fake dashboard records or premature services.

## Proposed domain model — RECOMMENDATION, not implemented schema

| Concept | Proposed fields/links and existing integration |
| --- | --- |
| Program | Reuse existing `Program`, its ID, workspace/organization scope, lifecycle, and dates. Mentorship is one program type; a stable type discriminator needs a later decision rather than relying on editable category text for security. |
| Program membership | One membership per `(userId, programId)`, status and participation dates. Evolve or migrate existing `UserProgramAssignment` rather than maintaining competing assignment systems. Roles become a set of program-specific grants: MENTEE, MENTOR, COORDINATOR, PROGRAM_ADMIN. Retain the existing global role solely for portal administration. |
| Enrollment/profile | Reuse `Beneficiary`/`ProgramEnrollment` data where compatible. Define how beneficiary records without accounts link to membership and how admissions state differs from active participation. Do not create duplicate users to supply another role. |
| Cohort | `id`, `programId`, `name`, `startDate`, `endDate`, `status`; e.g. Fall 2027 or 2027–2028 Academic Year. Add cohort membership/grants when enrollment is implemented, allowing repeated participation over time. |
| Mentorship relationship | `id`, `programId`, `cohortId`, mentor and mentee membership IDs, start/end dates, status. Both memberships must be active in the same program/cohort with the required role; mentor and mentee must be different users. Initially one mentor and one mentee per relationship. |
| Relationship workspace | A view keyed by relationship ID, one per active relationship. Do not create an extra workspace table unless it needs independent attributes. Existing operational Workspace access is too broad to reuse as student-record permission. |
| Resource / assignment | Future portal-wide approved Resource catalog, separate from ResourceAssignment linking a resource to a relationship/task and its progress. Files/Documents may provide storage/review integration after authorization review. |

Suggested lifecycle vocabularies (subject to program approval): membership PENDING/ACTIVE/PAUSED/ENDED; cohort PLANNED/ACTIVE/CLOSED; relationship PROPOSED/ACTIVE/PAUSED/COMPLETED/ENDED. Validate start <= end, program/cohort consistency, active-role eligibility, and duplicate active pairs in service logic plus appropriate database constraints. Define deletion/retention rules before introducing cascades for educational records.

Membership migration must preserve existing user IDs, beneficiary links, program assignments, and enrollment history. Additive migration/backfill and a compatibility period are preferable to deleting legacy fields. `MentorAssignment` and both `assignedMentorId` fields require reconciliation; none is silently promoted to the authoritative future relationship.

## Future workspace and access

Overview, Goals, Tasks, Sessions, Resources, and Progress are planned. A goal such as improving Calculus performance can lead to tutoring, weekly study planning, and assigned practice resources. No goal/task/session persistence is added in Phase 0.

| Actor | Future allowed scope |
| --- | --- |
| Mentee | Own memberships/relationships and explicitly shared records only. |
| Mentor | Active assigned relationships; no other students or cohorts. |
| Coordinator | Explicitly authorized programs/cohorts and participants. |
| Program administrator | Explicit administrative permissions within designated programs. |
| Portal administrator | Administrative permissions as explicitly defined; no automatic inheritance of private-note access without policy. |

Private mentor notes and administrative records require separate audiences, response projections, and tests. Neither shared workspace membership nor sponsor-visible program status grants access to those fields. Current SUPER_ADMIN/EXECUTIVE preview access is temporary and exposes no records; it is not the future participant authorization model.

## Current implementation status

- Imported portal remains in the same Next/Nest/Prisma architecture within this independent repository.
- Portal → Programs → Mentorship (`/programs/mentorship`) appears for SUPER_ADMIN and EXECUTIVE.
- `GET /api/mentorship/foundation` requires the existing JWT/account checks and role guard. Response: `{ "phase": 0, "status": "FOUNDATION", "enrollmentOpen": false }`.
- Loading, retry/error, restricted-access, and honest preparation/empty states use existing components. Planned workspace areas are informational, not working feature buttons.
- Phase 1A introduces Mentorship-owned program/cohort records. Phase 1B adds structured mentor/mentee applications and approved cohort participant records through migrations `0012_mentorship_programs_cohorts` and `0013_mentorship_participant_applications`; no matching results, relationships, or seeded mentorship data are introduced.
- Separate Docker project/ports/volumes, a fresh local environment generator, and VS Code tasks support development.
- See validation for executed checks and remaining Windows/Docker limitations.

## Development phases

| Phase | Scope |
| --- | --- |
| 0 | Complete: architecture discovery, independent local setup, secure administrative foundation. |
| 1 | Complete: program/cohort configuration and structured mentor, tutor, and mentee intake/review. |
| 2 | Complete for initial operations: matching recommendations, administrative approval, and durable formal relationship creation are implemented. Pause/completion workflows continue with Phase 3 workspace operations. |
| 3 | In progress: relationship workspace, goals, sessions, attendance, progress updates, and participant self-service are implemented; task-specific workflows and explicit note audiences remain. |
| 4 | Complete for initial operations: shared link-based learning materials, relationship/goal/session assignments, per-participant status, due dates, and completion tracking. |
| 5 | Complete for initial operations: mentor/tutor service-hour submission, administrative approval or rejection, verified-hour reporting, and explicit stipend eligibility/payment decisions. Completed sessions do not automatically become verified service hours. |
| 6 | Communication, notifications, calendar integration. |
| 7 | Analytics, surveys, outcomes, reporting with privacy-aware aggregation. |
| 8 | NextGen mobile client using the shared API. |
| 9 | AI-assisted mentorship, subject to data-use and human-review decisions. |

### Optional add-on and public intake

Mentorship is an organization entitlement (`MENTORSHIP`), not a mandatory portal feature or a global user role. Disabled organizations do not see the navigation and the API rejects access to their mentorship programs. Mentor, Tutor, and Mentee remain program participation roles.

Each program can enable a separate public application token. The public route does not require a portal account and only exposes active program/cohort form configuration. A valid submission creates a submitted application, an in-portal notification, an audit record, and a durable email-outbox item. Production-like staging can send directly through Resend with `RESEND_API_KEY` and `EMAIL_FROM`; the provider-neutral `EMAIL_DELIVERY_URL` webhook remains a fallback. Without a configured provider, the email remains queued while the portal notification remains available.

The NextGen public website is intentionally not modified in this repository. Its Join Us hyperlink/embed work is a separate deployment task using the generated public application URL.

## Known decisions

No replacement authentication, framework, database, or design system. No Phase 0 schema change. No automatic import of old database contents. No public enrollment. No production deployment or GitHub push as part of this phase. The old portal remains untouched. The new app uses host-based Node development and Docker infrastructure, matching the existing project approach.

## Open questions

1. Which staff may coordinate each program/cohort? Can one user hold mentor and mentee roles in different cohorts simultaneously?
2. What eligibility, consent, safeguarding, retention, and private-note policies apply?
3. Which legacy mentor links are authoritative, and is any real data to be migrated later?
4. What constitutes a program type versus a particular program instance/cohort?
5. What are the matching capacity and reassignment rules, and who approves a relationship?
6. Which reports may sponsors see, and what aggregation thresholds protect students?
7. What verified participation is needed for service-hour approval and stipend eligibility?
8. What is the eventual hosting, backup, recovery, and security-review plan?

The smallest next development task is a focused privacy fix for existing program/enrollment responses with cross-user regression tests, followed by a reviewed membership/cohort authorization design. Do not begin Phase 1 automatically.
