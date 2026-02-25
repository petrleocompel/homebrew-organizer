import { relations } from "drizzle-orm";
import { index, pgTableCreator } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `ho_${name}`);

export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }).notNull(),
  email: d.varchar({ length: 255 }).notNull().unique(),
  emailVerified: d.boolean().notNull().default(false),
  image: d.varchar({ length: 255 }),
  createdAt: d.timestamp("created_at").notNull().defaultNow(),
  updatedAt: d.timestamp("updated_at").notNull().defaultNow(),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    token: d.varchar({ length: 255 }).notNull().unique(),
    expiresAt: d.timestamp("expires_at").notNull(),
    ipAddress: d.varchar("ip_address", { length: 255 }),
    userAgent: d.text("user_agent"),
    userId: d
      .varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d.timestamp("created_at").notNull().defaultNow(),
    updatedAt: d.timestamp("updated_at").notNull().defaultNow(),
  }),
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    accountId: d.varchar("account_id", { length: 255 }).notNull(),
    providerId: d.varchar("provider_id", { length: 255 }).notNull(),
    userId: d
      .varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    accessToken: d.text("access_token"),
    refreshToken: d.text("refresh_token"),
    accessTokenExpiresAt: d.timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: d.timestamp("refresh_token_expires_at"),
    scope: d.varchar({ length: 255 }),
    idToken: d.text("id_token"),
    password: d.text(),
    createdAt: d.timestamp("created_at").notNull().defaultNow(),
    updatedAt: d.timestamp("updated_at").notNull().defaultNow(),
  }),
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const verifications = createTable("verification", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  identifier: d.varchar({ length: 255 }).notNull(),
  value: d.varchar({ length: 255 }).notNull(),
  expiresAt: d.timestamp("expires_at").notNull(),
  createdAt: d.timestamp("created_at").notNull().defaultNow(),
  updatedAt: d.timestamp("updated_at").notNull().defaultNow(),
}));

// Data tables
export const batches = createTable("batches", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  batchNumber: d.integer("batch_number").notNull(),
  name: d.varchar("name").notNull(),
  description: d.text("description").notNull(),
  note: d.text("note").notNull(),
  status: d
    .varchar("status")
    .notNull()
    .$type<"planning" | "brewing" | "fermenting" | "bottled" | "completed">(),
  created: d.timestamp("created").notNull().defaultNow(),
  updated: d
    .timestamp("updated")
    .defaultNow()
    .$onUpdate(() => new Date()),
}));

export const bottles = createTable("bottles", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  status: d
    .varchar("status")
    .notNull()
    .$type<"empty" | "filled" | "conditioning" | "ready">(),
  bottleNumber: d.integer("bottle_number").notNull(),
  currentBatchId: d.varchar({ length: 255 }).references(() => batches.id),
  created: d.timestamp("created").notNull().defaultNow(),
  updated: d
    .timestamp("updated")
    .defaultNow()
    .$onUpdate(() => new Date()),
}));

export const batchBottles = createTable("batch_bottles", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  batchId: d
    .varchar({ length: 255 })
    .notNull()
    .references(() => batches.id),
  bottleId: d
    .varchar({ length: 255 })
    .notNull()
    .references(() => bottles.id),
  created: d.timestamp("created").notNull().defaultNow(),
  updated: d
    .timestamp("updated")
    .defaultNow()
    .$onUpdate(() => new Date()),
}));
