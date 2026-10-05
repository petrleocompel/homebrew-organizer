# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Homebrew Organizer is a T3 Stack application for managing homebrew batches and bottles. It tracks batches through lifecycle stages (planning → brewing → fermenting → bottled → completed) and bottles through their states (empty → filled → conditioning → ready), with a many-to-many relationship via `batchBottles`.

## Commands

- `pnpm dev` — Start dev server with Turbopack
- `pnpm build` — Production build
- `pnpm typecheck` — TypeScript type checking
- `pnpm check` — Biome lint/format check
- `pnpm check:write` — Biome auto-fix (safe fixes)
- `pnpm check:unsafe` — Biome auto-fix (including unsafe fixes)
- `pnpm db:generate` — Generate Drizzle migration files
- `pnpm db:push` — Push schema directly to database
- `pnpm db:migrate` — Run migrations (drizzle-orm migrator via `src/scripts/migrate.ts`, prints full PostgreSQL errors)
- `pnpm db:seed-admin` — Create the bootstrap Owner from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- `pnpm build:scripts` — Bundle the migrate and seed scripts into `dist/` for the Docker image
- `pnpm test:unit` / `pnpm test:e2e` — Vitest unit tests / Playwright E2E (needs a disposable `PLAYWRIGHT_DATABASE_URL`)
- `pnpm db:studio` — Open Drizzle Studio GUI
- `./start-database.sh` — Start local PostgreSQL via Docker (reads DATABASE_URL from .env)

## Architecture

**Stack:** Next.js 16 (App Router, RSC) + tRPC + Drizzle ORM + PostgreSQL + better-auth (email/password) + Tailwind CSS v4 + shadcn/ui (new-york style)

**Path alias:** `@/*` → `./src/*`

**Key directories:**
- `src/server/api/routers/` — tRPC routers (`batch.ts`, `bottle.ts`), registered in `root.ts`
- `src/server/api/trpc.ts` — tRPC initialization, defines `publicProcedure` and `protectedProcedure`
- `src/server/db/schema.ts` — Drizzle schema; all tables prefixed with `ho_` (multi-project schema)
- `src/server/auth/` — better-auth config with Drizzle adapter
- `src/trpc/` — Client-side tRPC setup (`react.tsx` for React Query hooks, `server.ts` for RSC caller)
- `src/components/ui/` — shadcn/ui primitives
- `src/components/` — App-specific components (batch/bottle dialogs, lists, managers)
- `src/app/` — Next.js App Router pages (`batch/`, `bottle/` routes)
- `src/env.js` — Runtime env validation via `@t3-oss/env-nextjs` (requires `DATABASE_URL`, optional `BETTER_AUTH_SECRET` in dev)

**Environment:** Requires `DATABASE_URL` (PostgreSQL connection string); production also requires `PUBLIC_APP_URL` and `BETTER_AUTH_SECRET`. Instance identity (`OPERATOR_NAME`, `SUPPORT_EMAIL`, `APPLE_TEAM_ID`, `APPLE_BUNDLE_ID`) is optional and must never be hardcoded. Set `SKIP_ENV_VALIDATION=1` to skip env checks during Docker builds.

**Migrations:** Never edit or reorder a released migration. The migrator only applies entries newer than the last applied journal timestamp, so new migrations must be the newest entry in `drizzle/meta/_journal.json`.

**Docker & releases:** `Dockerfile` builds a Next.js `standalone` image (non-root) with bundled `scripts/migrate.mjs` and `scripts/seed-admin.mjs`. `compose.yaml` is the self-hosting example. `.github/workflows/image.yml` publishes `ghcr.io/petrleocompel/homebrew-organizer` (`edge` from `main`, semver + `latest` from `vX.Y.Z` tags) and creates the GitHub release.

## Code Style

- **Linter/formatter:** Biome (not ESLint/Prettier). Tailwind class sorting enabled for `clsx`, `cva`, `cn` functions.
- **Validation:** Zod for tRPC input validation and env schema.
- **Imports:** Use `@/` path alias. Use `import type` for type-only imports (verbatimModuleSyntax enabled).
