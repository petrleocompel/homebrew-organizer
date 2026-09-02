# Homebrew Organizer

Homebrew Organizer is the authoritative system for recipes, batches, reusable
bottles, permanent QR identities, label generation, team access, and audit
history. The browser uses tRPC while the native Homebrew Scan app uses the
versioned REST API under `/api/v1`.

## What is included

- Versioned BeerJSON 1.0 recipes with BeerJSON and BeerXML import/export.
- Batches pinned to immutable recipe revisions, lifecycle events, and
  unit-aware measurements.
- Reusable physical bottles with server-assigned numbers, permanent opaque QR
  identities, legacy aliases, fill history, retirement, and QR rotation.
- Curated public bottle pages at `/b/{publicCode}` and permanent redirects from
  legacy `/bottle/{locator}` links.
- Owner, Brewer, Cellar, and Viewer roles; invitation-only membership; bearer
  authentication for the native client; and mutation audit events.
- PDF label templates, QR/text overlays, duplicate-print protection, exact
  80 × 80 mm multipage PDFs, and ZIP/CSV exports.
- An OpenAPI 3.1 contract used to generate the Swift client during an Xcode
  build.

## Stack

- Next.js 16, React 19, tRPC, and Tailwind CSS
- PostgreSQL, Drizzle ORM, and additive SQL migrations
- Better Auth with session and bearer authentication
- Vitest and Playwright
- `pdf-lib`, Noto Sans, and vector QR generation

## Main routes

| Path | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Listed batch catalog |
| `/batch/{id}` | Public | Curated public batch detail |
| `/b/{publicCode}` | Public | Canonical bottle page and public fill history |
| `/bottle/{locator}` | Public | Permanent legacy redirect |
| `/admin` | Team | Dashboard |
| `/admin/batches` | Team | Batch lifecycle and measurements |
| `/admin/recipes` | Brewer+ | Recipe revisions and interchange |
| `/admin/bottles` | Team | Bottle inventory and fill operations |
| `/admin/labels` | Brewer+ | Label templates and print runs |
| `/admin/team` | Owner | Memberships, invitations, and activity |
| `/api/v1/*` | Mixed | Versioned native-client API |
| `/.well-known/apple-app-site-association` | Public | Universal Link association |

The committed API contract is
[`openapi/homebrew-v1.yaml`](openapi/homebrew-v1.yaml).

## Local development

Requirements:

- Node.js 24 and pnpm 10.33
- PostgreSQL 18, or Docker/Podman for the supplied development helper

Set up a fresh checkout:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
./start-database.sh
pnpm db:migrate
pnpm db:seed-admin
pnpm dev
```

Open `http://127.0.0.1:3000`. Registration is closed; the explicit seed command
creates or restores the bootstrap Owner membership.

The committed `pnpm-lock.yaml` is the authoritative dependency resolution.

## Upgrading an existing database

Back up PostgreSQL before applying migrations. The migration is additive and
retains the compatibility columns for one release.

```bash
pnpm db:migration-preflight
pnpm db:migrate
```

The read-only preflight reports duplicate bottle or batch numbers and the
missing numeric bottles in the legacy 11–30 range. Resolve duplicates before
running the migration. The migration then creates permanent public codes and
aliases, supplies missing 11–30 bottles, and converts current and historical
assignments into fills and events.

After migration, verify every legacy label from 11 through 30 and take a second
backup before eventually removing compatibility columns in a later release.

## Environment

See [`.env.example`](.env.example) for the complete list. The important
variables are:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection |
| `BETTER_AUTH_SECRET` | Better Auth signing secret |
| `BETTER_AUTH_URL` | Authentication origin |
| `PUBLIC_APP_URL` | Canonical QR and public-link origin |
| `ALLOWED_QR_HOSTS` | Comma-separated QR host allowlist |
| `RECIPE_UPLOAD_MAX_BYTES` | Recipe upload limit |
| `PDF_UPLOAD_MAX_BYTES` | Label artwork upload limit |
| `APPLE_TEAM_ID` | Optional AASA team identifier |
| `APPLE_BUNDLE_ID` | Homebrew Scan bundle identifier |

Deployment and bootstrap credentials currently remain tracked in this
repository by project decision. Treat access to the repository as access to
those credentials.

## Tests and checks

```bash
pnpm check
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:e2e:install
pnpm test:e2e
pnpm audit --prod
```

Playwright requires a disposable PostgreSQL database configured through
`PLAYWRIGHT_DATABASE_URL`. Its preparation step creates the named database,
applies the schema, clears existing `ho_*` data, and seeds Owner and Viewer
fixtures. Never point it at a database containing useful data.

The API E2E suite covers public-data privacy, bearer authentication, role
boundaries, idempotency and concurrent assignment, recipe interchange, label
preflight, exact page dimensions, and downloadable PDF/ZIP output.

## Docker and rollout

Build the standalone application image with:

```bash
docker build -t homebrew-organizer .
```

Database migrations are an explicit pre-deployment step and are not run by
application startup. A safe rollout is:

1. Back up PostgreSQL.
2. Run the migration preflight and migrations from the checked-out release.
3. Deploy the application image.
4. Verify canonical and legacy bottle links.
5. Print and physically scan a sample 80 × 80 mm label.
6. Distribute the matching Homebrew Scan build through TestFlight.
