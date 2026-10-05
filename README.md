# Homebrew Organizer

[![CI](https://github.com/petrleocompel/homebrew-organizer/actions/workflows/ci.yml/badge.svg)](https://github.com/petrleocompel/homebrew-organizer/actions/workflows/ci.yml)
[![Image](https://github.com/petrleocompel/homebrew-organizer/actions/workflows/image.yml/badge.svg)](https://github.com/petrleocompel/homebrew-organizer/pkgs/container/homebrew-organizer)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Homebrew Organizer is a self-hosted system for homebrew recipes, batches,
reusable bottles, permanent QR identities, label generation, team access, and
audit history. The browser uses tRPC while the native Homebrew Scan app uses the
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

## Self-hosting

Images are published to the GitHub Container Registry for `linux/amd64` and
`linux/arm64`:

| Tag | Source |
| --- | --- |
| `latest`, `X.Y.Z`, `X.Y` | Release tags `vX.Y.Z` |
| `edge` | Latest commit on `main` |
| `sha-<commit>` | Any published commit |

The supplied [`compose.yaml`](compose.yaml) runs PostgreSQL, applies migrations
in a one-shot `migrate` container, and then starts the app on port 3000:

```bash
curl -O https://raw.githubusercontent.com/petrleocompel/homebrew-organizer/main/compose.yaml
curl -o .env https://raw.githubusercontent.com/petrleocompel/homebrew-organizer/main/.env.example
# Set PUBLIC_APP_URL, BETTER_AUTH_SECRET and POSTGRES_PASSWORD in .env
docker compose up -d
docker compose run --rm -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='a-long-password' \
  app node scripts/seed-admin.mjs
```

Registration is closed: the seed command creates the first Owner, who then
invites everyone else. Put a TLS-terminating reverse proxy in front of the app
and set `PUBLIC_APP_URL` to its public HTTPS origin. Printed QR labels encode
that origin, so choose it before printing.

Pin `HOMEBREW_ORGANIZER_VERSION` in `.env` to a release instead of `latest`
for predictable upgrades. Back up PostgreSQL before upgrading; migrations run
automatically when the stack starts.

The image also works without Compose:

```bash
docker run --rm -e DATABASE_URL=... ghcr.io/petrleocompel/homebrew-organizer node scripts/migrate.mjs
docker run -d -p 3000:3000 -e DATABASE_URL=... -e PUBLIC_APP_URL=... -e BETTER_AUTH_SECRET=... \
  ghcr.io/petrleocompel/homebrew-organizer
```

## Configuration

See [`.env.example`](.env.example) for the complete list.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `PUBLIC_APP_URL` | Production | Canonical QR, public-link, and authentication origin |
| `BETTER_AUTH_SECRET` | Production | Better Auth signing secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | No | Authentication origin when it differs from `PUBLIC_APP_URL` |
| `ALLOWED_QR_HOSTS` | No | Comma-separated QR host allowlist; defaults to the `PUBLIC_APP_URL` host |
| `RECIPE_UPLOAD_MAX_BYTES` | No | Recipe upload limit (default 5 MiB) |
| `PDF_UPLOAD_MAX_BYTES` | No | Label artwork upload limit (default 10 MiB) |
| `OPERATOR_NAME` | No | Operator shown on the footer and privacy page |
| `SUPPORT_EMAIL` | No | Contact shown on the footer, privacy, and support pages |
| `APPLE_TEAM_ID`, `APPLE_BUNDLE_ID` | No | Serve iOS Universal Links for `/b/*` when both are set |

## Local development

Requirements:

- Node.js 24 and pnpm 10.33
- PostgreSQL 18, or Docker/Podman for the supplied development helper

```bash
pnpm install --frozen-lockfile
cp .env.example .env
./start-database.sh
pnpm db:migrate
pnpm db:seed-admin   # uses ADMIN_EMAIL / ADMIN_PASSWORD from .env
pnpm dev
```

Open `http://localhost:3000` and sign in as the seeded Owner.

## Upgrading a pre-release database

Databases created before the bottle-identity migration can be checked first
with the read-only preflight:

```bash
pnpm db:migration-preflight
pnpm db:migrate
```

The preflight reports duplicate bottle or batch numbers and the numeric bottles
in the legacy 11–30 range that the migration will create. Resolve duplicates
before migrating. The migration then creates permanent public codes and
aliases, supplies missing 11–30 bottles, and converts current and historical
assignments into fills and events.

## Tests and checks

```bash
pnpm check
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:e2e:install
pnpm test:e2e
```

Playwright requires a disposable PostgreSQL database configured through
`PLAYWRIGHT_DATABASE_URL`. Its preparation step creates the named database,
applies the schema, clears existing `ho_*` data, and seeds Owner and Viewer
fixtures. Never point it at a database containing useful data.

The API E2E suite covers public-data privacy, bearer authentication, role
boundaries, idempotency and concurrent assignment, recipe interchange, label
preflight, exact page dimensions, and downloadable PDF/ZIP output.

## Releases

Push a `vX.Y.Z` tag on `main`. The Image workflow publishes the multi-arch
image with build provenance and creates a GitHub release with generated notes.
Tags with a suffix such as `v1.2.0-rc.1` become pre-releases.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities privately as
described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
