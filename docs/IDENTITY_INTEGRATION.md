# Pilye identity and Potay integration boundary

Pilye owns its users, credentials, invitation tokens, roles, sessions, and audit records. Public self-registration remains disabled. A Pilye Super Admin approves access, which creates or links a Pilye account and sends a one-time activation invitation. Invitation tokens are stored only as hashes and expire after seven days.

## NextGen/Potay integration

Pilye must not read or write the NextGen Portal database. A future Potay launcher or organization-wide sign-in can integrate through one of these boundaries:

1. standards-based OIDC identity federation, where Pilye validates issuer, audience, signature, expiry, and a stable external subject before mapping it to a Pilye-owned user; or
2. a versioned, authenticated provisioning API that asks Pilye to create or refresh an invitation. Pilye remains the system of record for its role and classroom permissions.

Federated identity must never grant a Pilye role directly from an untrusted client claim. The local Super Admin assignment remains authoritative. Account linking must use a verified external subject; matching by email alone is allowed only during the controlled invitation claim flow.

## Deployment requirements

- Use a separate Pilye database and signing secrets.
- Keep `JWT_SECRET`, invitation tokens, and email-delivery credentials out of Potay configuration.
- Allow only HTTPS callback and API origins in production.
- Audit invitation creation, activation, role assignment, federation linking, and unlinking.
- Roll out federation behind configuration so standalone Pilye login continues to work during Potay outages.

Multitenancy is intentionally deferred. This boundary does not introduce tenant identifiers or shared-database assumptions.
