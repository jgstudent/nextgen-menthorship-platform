# API Documentation

Base URL: `http://localhost:4000/api`

## Authentication

### Register

`POST /auth/register`

```json
{
  "email": "member@example.org",
  "password": "ChangeMe123!",
  "firstName": "Marie",
  "lastName": "Jean",
  "role": "TEAM_MEMBER"
}
```

### Login

`POST /auth/login`

```json
{
  "email": "admin@nextgenhaitian.org",
  "password": "ChangeMe123!"
}
```

Response includes `accessToken`. Send it as:

```http
Authorization: Bearer <token>
```

## Workspaces

`GET /workspaces`

`POST /workspaces`

```json
{
  "organizationId": "org_id",
  "name": "Education Program",
  "slug": "education-program",
  "description": "STEM training and education partnerships."
}
```

## Executive Governance

Restricted to `SUPER_ADMIN` and `EXECUTIVE` users in the app navigation. `PROJECT_MANAGER` can only use the API if explicitly assigned to the Executive Governance workspace.

`GET /governance/summary`

`GET /governance/meetings`

`GET /governance/approvals`

`GET /governance/files`

`GET /governance/documents`

`GET /governance/policies`

`POST /governance/policies`

```json
{
  "title": "Board Confidentiality and Records Handling",
  "description": "Executive policy draft.",
  "status": "UNDER_REVIEW",
  "version": "1.0"
}
```

`GET /governance/resolutions`

`POST /governance/resolutions`

```json
{
  "title": "Governance Workspace Operating Authority",
  "description": "Board authorization draft.",
  "status": "UNDER_REVIEW",
  "resolutionNumber": "2026-001"
}
```

## Projects

`GET /projects`

`POST /projects`

```json
{
  "organizationId": "org_id",
  "workspaceId": "workspace_id",
  "name": "Haiti STEM Training Program",
  "slug": "haiti-stem-training-program",
  "status": "ACTIVE"
}
```

## Boards

`GET /boards`

`GET /boards?projectId=<project_id>`

`POST /boards`

```json
{
  "workspaceId": "workspace_id",
  "projectId": "project_id",
  "name": "Launch Board",
  "description": "Program launch execution board."
}
```

`POST /boards/:id/groups`

```json
{
  "name": "Curriculum",
  "color": "#d6a419",
  "order": 3
}
```

`POST /boards/:id/columns`

```json
{
  "name": "Budget",
  "type": "NUMBER",
  "settingsJson": { "currency": "USD" },
  "order": 5
}
```

## Tasks

`GET /tasks`

`GET /tasks?boardId=<board_id>`

`POST /tasks`

```json
{
  "boardId": "board_id",
  "groupId": "group_id",
  "title": "Confirm partner schools",
  "description": "Collect final partner school contacts.",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "assigneeId": "user_id",
  "dueDate": "2026-06-14"
}
```

`PATCH /tasks/:id`

```json
{
  "status": "COMPLETED"
}
```

`DELETE /tasks/:id`

## Comments

`GET /comments/task/:taskId`

`POST /comments`

```json
{
  "itemId": "task_id",
  "body": "Updated the partner list with two new contacts."
}
```

## Files

Uploads use `multipart/form-data` with a `file` field. Optional link fields are `taskId`, `projectId`, and `commentId`.

`POST /files/upload`

`GET /files`

`GET /files/:id`

Returns metadata plus a short-lived authenticated `downloadUrl`.

`DELETE /files/:id`

`GET /tasks/:taskId/files`

`POST /tasks/:taskId/files`

Supported file types: PDF, DOCX, XLSX, PPTX, PNG, JPG, JPEG, TXT, CSV. Default max file size is 25 MB.

## Documents

Document signing records are scoped through the same workspace, program, project, beneficiary, workshop, file, and approval access rules as the rest of the platform. Documents linked to an approval cannot be sent for signature until that approval is `APPROVED`.

`GET /documents`

`POST /documents`

```json
{
  "title": "Scholarship Agreement",
  "description": "Signature packet for a beneficiary award.",
  "workspaceId": "workspace_id",
  "programId": "program_id",
  "approvalId": "approval_id",
  "fileId": "file_id",
  "docusealTemplateId": "docuseal_template_id",
  "sponsorVisible": false
}
```

`GET /documents/:id`

`PATCH /documents/:id`

`DELETE /documents/:id`

`POST /documents/:id/send-for-signature`

```json
{
  "signers": [
    {
      "userId": "optional_user_id",
      "name": "Marie Jean",
      "email": "marie@example.org",
      "role": "Signer"
    }
  ]
}
```

`GET /documents/:id/submissions`

`GET /documents/:id/signers`

## DocuSeal Webhook

`POST /webhooks/docuseal`

Set `DOCUSEAL_WEBHOOK_SECRET` and send it as `x-docuseal-secret` or `x-webhook-secret` when enabling webhook verification.

## Pilye mentorship classrooms

Administrative endpoints require a Pilye `SUPER_ADMIN` or `EXECUTIVE` token unless noted. Participant approval and the resulting account invitation require `SUPER_ADMIN`.

- `GET /mentorship/programs/:programId/relationships` returns separate mentor and tutor classrooms, including goals, sessions, assignments, notes, and progress.
- `POST /mentorship/programs/:programId/relationships/:relationshipId/assignments`
- `PATCH /mentorship/programs/:programId/relationships/:relationshipId/assignments/:assignmentId`
- `POST /mentorship/programs/:programId/relationships/:relationshipId/notes` supports `SHARED` and `STAFF_ONLY` visibility.
- `POST /mentorship/programs/:programId/notifications/process` idempotently queues reminders for sessions in the next 24 hours and overdue assignments. A trusted scheduler may call this endpoint periodically.
- `POST /mentorship/programs/:programId/notifications/email-outbox/retry` retries up to 100 pending messages. This endpoint is restricted to `SUPER_ADMIN` and requires a non-empty `recipients` email array so a retry cannot accidentally target the full outbox.
- `GET /mentorship/portal` returns only classrooms linked to the signed-in participant. Staff-only notes are excluded.
- `PATCH /mentorship/portal/assignments/:assignmentId` permits only the assigned participant to update status.
- `POST /mentorship/portal/relationships/:relationshipId/notes` always creates a shared note and requires classroom membership.

Session creation sends schedule notices. Participant rescheduling and cancellation send relationship-scoped email and in-app notices. Notification records use deduplication keys so reminder processing is safe to retry.

Email delivery supports Resend directly with `RESEND_API_KEY` and `EMAIL_FROM`. The provider-neutral `EMAIL_DELIVERY_URL` webhook remains available as a fallback.
