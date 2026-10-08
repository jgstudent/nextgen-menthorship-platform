# Pilye product boundary

Pilye is NextGen Haitian Empowerment's standalone mentorship and learning product. It is a member of the Potay ecosystem, but it is not a screen inside the Potay operations portal.

## Product promise

Pilye should feel like a calm, human classroom: safe, encouraging, focused, and easy to return to. Participant language favors classroom, learning plan, next step, mentor, and progress over administrative terminology.

## Experiences

### My Classroom

The participant experience is available at `/my-mentorship` and adapts to a person's approved mentee, mentor, or tutor participation. It includes:

- the next scheduled session and meeting entry point;
- mentor or learner relationships;
- goals and visible progress;
- assigned learning resources and completion status;
- recurring availability;
- session rescheduling, cancellation, and feedback;
- progress history; and
- verified service-hour submission and stipend status for mentors and tutors.

### Educator Console

Authorized program staff use `/programs/mentorship` and its protected subroutes for:

- program and cohort configuration;
- public and administrative applications;
- applicant review and participant activation;
- human-approved matching;
- relationship, goal, session, attendance, and progress management;
- the learning-resource library and assignments;
- service-hour verification and stipend decisions; and
- monitoring, alerts, completion measures, and exports.

### Public application

Tokenized `/apply/mentorship/[token]` pages use the Pilye identity and do not require a Potay or Pilye account. Application status remains private and administrative approval remains required.

## Ecosystem boundary

- Pilye owns the classroom experience and mentorship records.
- Pilye owns authentication, invitation tokens, roles, and audit records; only a Super Admin can approve participant access.
- Potay is the ecosystem entry point and product launcher.
- Potay/NextGen integration uses OIDC federation or a versioned provisioning API and never a direct database dependency. See `IDENTITY_INTEGRATION.md`.
- A configurable `NEXT_PUBLIC_POTAY_URL` powers the explicit “Return to Potay” link.
- Internal package, container, and database identifiers may retain their historical `nextgen-mentorship` names; those identifiers are not customer-facing branding.
- Other copied portal routes are not exposed in Pilye navigation. They should be removed only after migration and retention review, not as part of a visual rebrand.

## Release acceptance

Before promoting a Pilye release:

1. Generate the Prisma client and run API and web type checks.
2. Run the API automated suite.
3. Build the optimized web app and container images.
4. Validate sign-in, public application, participant classroom, and every Educator Console route.
5. Verify roles, organization isolation, and the Mentorship entitlement.
6. Confirm HTTPS, backups, restore, runtime secrets, and rollback image digests.
7. Test keyboard access and responsive layouts on the sign-in, classroom, and application flows.
