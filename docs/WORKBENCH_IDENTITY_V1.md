# LotScope Workbench Identity v1

Status: founder-canary source implementation.

## Trust boundary

- Public LotScope assessment remains anonymous.
- `/workbench/**` and `/api/workbench/**` require an AeroVista native app session and live `lotscope.workbench.access`.
- Browser code never receives `IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH` or the native AVCC session token.
- The native app session is held only in a Secure, HttpOnly, SameSite=Lax cookie.
- Protected actions fail closed when session resolution or capability authorization is unavailable.

## App Adapter package

LotScope consumes the private GitHub Package `@aerovista-us/app-adapter@0.4.0`.

Because this repository is public, CI must **not** grant the repository's fork-capable `GITHUB_TOKEN` direct read access to the private package. Workflows instead expect an Actions secret named:

```text
AEROVISTA_PACKAGES_TOKEN
```

It must be a dedicated credential with the minimum package-read access required for `@aerovista-us/app-adapter`. Do not place it in source, `.npmrc`, browser code, or Vercel runtime variables. Fork-origin pull requests do not receive repository Actions secrets and therefore cannot retrieve the private package.

## Runtime secret

Production LotScope requires the same broker secret value on both sides:

```text
Identity Gateway: IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH
LotScope server:    IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH
```

This secret is server-only. The Identity Gateway compose runtime projection was added in ACOS PR #72.

## Founder canary acceptance

1. Account login for `lotscope_workbench`.
2. Server-side one-time handoff exchange.
3. Native AVCC relying-app session mint.
4. `identity.describe()`.
5. Live `identity.can(lotscope.workbench.access)`.
6. Protected Workbench and API access.
7. Scoped LotScope logout/revoke.
8. Protected routes fail closed after revoke while the separate Account session remains active.

Shared workspace persistence is intentionally out of scope until this canary is accepted.
