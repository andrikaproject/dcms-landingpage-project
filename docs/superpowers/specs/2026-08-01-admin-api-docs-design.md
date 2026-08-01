# Admin API Documentation Page — Design

## Purpose

Provide a private, admin-only API reference for the DCMS application. The page documents every current HTTP endpoint implemented under `app/api`, while presenting an Express-ready target path so the Next.js frontend can later call a separately deployed Express backend without changing the documented contract.

## Route and authorization

- **Page route:** `/dashboard/admin/api-docs`
- **Access:** require a valid NextAuth session with `session.user.role === "ADMIN"`.
- **Unauthorized behavior:** redirect to `/dashboard`, matching existing admin pages.
- The existing `/dashboard/:path*` middleware provides login protection. The server page performs the role check.

## Information architecture

The page renders inside `DashboardShell` and follows the dark DCMS dashboard visual language.

1. **Header:** page title, purpose, and a contract note that Express paths use the `/v1` namespace.
2. **Operational summary:** authentication model, current rate-limit behavior, and the shared error envelope.
3. **Endpoint browser:** category filter and text search.
4. **Endpoint cards:** one expandable card per operation. A collapsed card shows method, current Next.js path, proposed Express path, short description, access requirement, and rate-limit rule.
5. **Expanded reference:** parameters or JSON body, success response example, error behavior, and a copyable cURL example.

Categories are: Gateway, Market, Market Analysis, Signals, Account & Authentication, Administration, and System.

## Documentation data model

The presentation component receives endpoint metadata from a local typed module. Each definition includes:

- `id`, `category`, `method`, `currentPath`, `expressPath`, and `summary`
- `access` (`Public`, `Authenticated`, or `Admin`)
- `rateLimit` as observed in the existing implementation
- `query` and `body` field definitions with required/default/value constraints
- `successExample`, `errorExamples`, and `curl`
- a `notes` field for feature flags, caching behavior, or migration notes

Keeping metadata separate from rendering makes future migration to OpenAPI or an Express-owned source of truth straightforward.

## Contract conventions

- All current relative endpoints begin with `/api`; target backend URLs begin with `/v1`.
- Session-protected operations are documented as requiring a session/cookie today. The page labels the target mechanism as an access token or authenticated session, to be selected during Express implementation.
- Gateway endpoints preserve their `{ ok, data }` success envelope and structured `{ ok: false, error: { code, message, ... } }` failures.
- Other legacy endpoints retain their currently observed response envelopes so the frontend migration can remain incremental.
- Rate-limit rules are documented as the current per-user/IP in-memory limits and explicitly marked as needing a shared store (for example Redis) in a multi-instance Express deployment.

## Endpoint coverage

The initial reference documents every route handler present under `app/api`:

| Category | Current operations |
| --- | --- |
| Gateway | `GET /api/gateway/market/dashboard`, `POST /api/gateway/bitunix/validate` |
| Market | `GET /api/market-dashboard`, `GET /api/market-signal`, `GET /api/scam-pump-board`, `GET /api/vpvr` |
| Market Analysis | `GET /api/market-analysis/key-levels`, `GET /api/market-analysis/pwl-scanner` |
| Signals | `GET /api/signal-history`, `GET /api/locked-signals`, `POST /api/locked-signals` |
| Account & Authentication | `POST /api/validate-bitunix-user`, `POST /api/bitunix-users/register`, `POST /api/password-reset/request`, `POST /api/password-reset/confirm`, `GET/POST /api/auth/[...nextauth]` |
| Administration | `GET /api/bitunix-users`, `GET/PUT/DELETE /api/bitunix-users/:id` |
| System | `POST /api/analytics/vitals` |

## Error handling and empty states

- The UI must not issue calls to the documented endpoints; it is a reference only.
- Search with no matching endpoint shows a clear empty state and a reset action.
- Copy actions give inline confirmation and gracefully fall back if the browser clipboard API is unavailable.
- The documentation marks malformed input (400), missing authentication (401), insufficient role (403), missing resource (404), duplicate state (409), rate limiting (429), disabled feature (503), and upstream failures (502) where each is implemented.

## Verification

- Confirm an admin can load `/dashboard/admin/api-docs`.
- Confirm a signed-out user follows existing middleware login behavior and a non-admin is redirected to `/dashboard`.
- Confirm every `app/api/**/route.js` handler is represented.
- Verify search, category filtering, card expansion, and cURL copy interaction in desktop and mobile layouts.
- Run lint and a production build after implementation.

## Out of scope

- Moving endpoints to Express.
- Creating a public API portal or issuing API keys.
- Adding Swagger UI or a generated OpenAPI specification.
- Altering any existing endpoint behavior.
