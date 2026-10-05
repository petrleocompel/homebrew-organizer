# Contributing

Thanks for helping improve Homebrew Organizer. Bug reports, fixes, and focused
feature proposals are welcome.

## Before you start

- For anything larger than a small fix, open an issue first so the approach can
  be agreed before you invest time in it.
- Never include real credentials, hostnames, or personal data in code, tests,
  fixtures, screenshots, or issues. Use `example.com` addresses and placeholder
  secrets.

## Development setup

Follow [Local development](README.md#local-development) in the README. You need
Node.js 24, pnpm 10.33, and PostgreSQL 18 (or Docker for `./start-database.sh`).

## Making changes

- Code style is enforced by Biome: run `pnpm check:write` before committing.
- Use the `@/` import alias and `import type` for type-only imports.
- Validate tRPC and REST inputs with Zod.
- Keep the REST contract in [`openapi/homebrew-v1.yaml`](openapi/homebrew-v1.yaml)
  in sync with any `/api/v1` change.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `build:`, `ci:` …); they feed the generated
  release notes.

### Database migrations

- Change `src/server/db/schema.ts`, then run `pnpm db:generate` to create a new
  migration in `drizzle/`.
- Never edit or reorder a migration that has been released. The migrator only
  applies migrations whose journal timestamp is newer than the last applied
  one, so a new migration must always be the newest entry in
  `drizzle/meta/_journal.json`.
- Prefer additive, idempotent SQL and test the migration against a database
  created from the previous release.

## Checks

Run these before opening a pull request; CI runs the same set:

```bash
pnpm check
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:e2e   # needs PLAYWRIGHT_DATABASE_URL pointing at a disposable database
```

## Pull requests

- Keep each pull request focused on one change and describe what changed and
  why.
- Add or update tests for behaviour changes.
- Update the README or `.env.example` when you add configuration.

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).
