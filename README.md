# Homebrew Organizer

A web app for tracking homebrew batches and bottles through their full lifecycle — from planning a brew to having a ready bottle in hand.

## Features

- Track **batches** through lifecycle stages: `planning → brewing → fermenting → bottled → completed`
- Track **bottles** through states: `empty → filled → conditioning → ready`
- Many-to-many relationship between batches and bottles
- **Public read-only views** for batches and bottles (shareable links)
- **Admin area** with full CRUD, protected by email/password authentication

## Routes

| Path | Access | Description |
|---|---|---|
| `/` | Public | Read-only list of all batches |
| `/batch/[id]` | Public | Batch details + assigned bottles |
| `/bottle/[id]` | Public | Individual bottle status |
| `/admin` | Protected | Batch management (create, edit, delete) |
| `/admin/batch/[id]` | Protected | Bottle management for a batch |
| `/admin/bottle/[id]` | Protected | Individual bottle edit |
| `/sign-in` | Public | Admin sign-in |

## Stack

- **[Next.js 16](https://nextjs.org)** — App Router, React Server Components
- **[tRPC](https://trpc.io)** — end-to-end type-safe API
- **[Drizzle ORM](https://orm.drizzle.team)** — schema, migrations, queries
- **[PostgreSQL](https://www.postgresql.org)** — database
- **[better-auth](https://www.better-auth.com)** — email/password authentication
- **[Tailwind CSS v4](https://tailwindcss.com)** + **[shadcn/ui](https://ui.shadcn.com)** — styling

## Local Development

### Prerequisites

- Node.js 20+
- Docker or Podman (for the local database)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the example env file and fill in your values
cp .env.example .env   # or create .env manually — see Environment Variables below

# 3. Start the local PostgreSQL container
./start-database.sh

# 4. Push the schema to the database
npm run db:push

# 5. Seed the admin user
npm run db:seed-admin

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The admin area is at [http://localhost:3000/admin](http://localhost:3000/admin).

## Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL connection string (required)
DATABASE_URL=postgresql://postgres:password@localhost:5432/homebrew-organizer

# better-auth secret — any random string (required in production, optional in dev)
BETTER_AUTH_SECRET=your-secret-here

# Public URL of the app (required in production)
BETTER_AUTH_URL=https://your-domain.com
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type check |
| `npm run check` | Biome lint + format check |
| `npm run check:write` | Biome auto-fix (safe) |
| `npm run db:push` | Push schema directly to DB (dev) |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:studio` | Open Drizzle Studio GUI |
| `npm run db:seed-admin` | Create the default admin user |
| `./start-database.sh` | Start local PostgreSQL via Docker/Podman |

## Database

Schema is defined in `src/server/db/schema.ts`. Tables are prefixed with `homebrew-organizer_` to support multi-project databases.

**Key tables:**

- `homebrew-organizer_batches` — brewing batches
- `homebrew-organizer_bottles` — physical bottles
- `homebrew-organizer_batch_bottles` — batch ↔ bottle assignments
- `homebrew-organizer_user/session/account/verification` — better-auth tables

For development, use `db:push` to sync the schema without migrations. For production, generate and run migrations with `db:generate` + `db:migrate`.

## Deployment

The app ships as a Docker image.

```bash
# Build the image
docker build -t homebrew-organizer .

# Or use the compose file (adjust env vars first)
docker compose up -d
```

After the first deploy, run the admin seed:

```bash
docker compose exec app npm run db:seed-admin
```
