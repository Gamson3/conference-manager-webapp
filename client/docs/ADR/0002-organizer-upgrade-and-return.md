# ADR 0002: Organizer Self-Upgrade with Return-to-Intent

- Status: Accepted (Nov 2025)
- Context: Base users hit organizer pages and were denied with no path forward; upgrading should not force them to re-navigate.
- Decision: Provide self-upgrade action (server endpoint changes `User.role`), and preserve the originally requested organizer path via a `from` query parameter to return after success.
- Consequences:
  - Positive: Frictionless onboarding; short time-to-task; stateless return path compatible with SSR.
  - Negative: Needs validation to avoid open redirects (we constrain to `/organizer`).
- Alternatives Considered: Session storage for return path; redirect to dashboard only.
