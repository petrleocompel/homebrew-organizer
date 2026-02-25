# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Homebrew Organizer is a T3 Stack application for managing homebrew batches and bottles. It tracks batches through lifecycle stages (planning → brewing → fermenting → bottled → completed) and bottles through their states (empty → filled → conditioning → ready), with a many-to-many relationship via `batchBottles`.

## Commands

- `npm run dev` — Start dev server with Turbopack
- `npm run build` — Production build
- `npm run typecheck` — TypeScript type checking
- `npm run check` — Biome lint/format check
- `npm run check:write` — Biome auto-fix (safe fixes)
- `npm run check:unsafe` — Biome auto-fix (including unsafe fixes)
- `npm run db:generate` — Generate Drizzle migration files
- `npm run db:push` — Push schema directly to database
- `npm run db:migrate` — Run migrations
- `npm run db:studio` — Open Drizzle Studio GUI
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

**Environment:** Requires `DATABASE_URL` (PostgreSQL connection string). Set `SKIP_ENV_VALIDATION=1` to skip env checks during Docker builds.

## Code Style

- **Linter/formatter:** Biome (not ESLint/Prettier). Tailwind class sorting enabled for `clsx`, `cva`, `cn` functions.
- **Validation:** Zod for tRPC input validation and env schema.
- **Imports:** Use `@/` path alias. Use `import type` for type-only imports (verbatimModuleSyntax enabled).
