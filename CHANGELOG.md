# Changelog

## 0.1.0-staging.1 — 2026-10-06

Initial staging snapshot of the independently developed NextGen Mentorship Platform.

### Included

- Optional organization-level Mentorship add-on.
- Program and cohort configuration with cohort-specific public application links.
- Mentor, tutor, and mentee intake, review, eligibility, and participant creation.
- Administrator-reviewed matching and formal mentorship relationships.
- Goals, sessions, attendance, progress updates, and participant self-service.
- Cohort monitoring, inactivity and overdue-session alerts, and CSV reporting.
- Shared learning resources with relationship, goal, and session assignments.
- Mentor and tutor service-hour submission with administrative verification.
- Explicit stipend eligibility and payment decisions based on approved hours.
- Public application notifications and provider-neutral email outbox.

### Deployment status

- Database migrations are versioned through `0022_mentorship_verified_service_hours`.
- This tag is a staging candidate, not a production release.
- Production application containers, SSO integration, security acceptance, and deployment automation remain subsequent work.
