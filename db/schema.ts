import { randomUUID } from "node:crypto";
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  datetime,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const userRoles = ["ADMIN", "USER", "BITUNIX"] as const;
export const approvalStatuses = ["NONE", "PENDING", "APPROVED", "REJECTED"] as const;

const id = (name = "id") =>
  varchar(name, { length: 191 })
    .primaryKey()
    .$defaultFn(() => randomUUID());

const dateTime = (name: string) => datetime(name, { mode: "date", fsp: 3 });
const createdAt = (name = "createdAt") =>
  dateTime(name)
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`);
const updatedAt = (name = "updatedAt") =>
  dateTime(name)
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdateFn(() => new Date());

export const users = mysqlTable(
  "User",
  {
    id: id(),
    name: varchar("name", { length: 191 }),
    email: varchar("email", { length: 191 }).notNull(),
    password: varchar("password", { length: 191 }).notNull(),
    role: mysqlEnum("role", userRoles).notNull().default("USER"),
    uuidBitunix: varchar("uuidBitunix", { length: 191 }),
    statusReview: mysqlEnum("statusReview", approvalStatuses).notNull().default("NONE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("User_email_key").on(table.email),
    uniqueIndex("User_uuidBitunix_key").on(table.uuidBitunix),
  ],
);

export const bitunixUsers = mysqlTable(
  "bitunix_users",
  {
    id: bigint("id", { mode: "bigint", unsigned: true }).autoincrement().primaryKey(),
    uuidBitunix: varchar("uuid_bitunix", { length: 32 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 120 }),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 32 }).notNull().default("BITUNIX"),
    bitunixStatus: varchar("bitunix_status", { length: 32 }).notNull().default("VERIFIED"),
    amountUsdt: decimal("bitunix_deposit_usdt", { precision: 18, scale: 8 }),
    lastTradeAt: dateTime("last_trade_at"),
    bitunixVerifiedAt: dateTime("bitunix_verified_at"),
    bitunixLastCheckedAt: dateTime("bitunix_last_checked_at"),
    createdAt: createdAt("created_at"),
    updatedAt: updatedAt("updated_at"),
  },
  (table) => [
    uniqueIndex("bitunix_users_uuid_bitunix_key").on(table.uuidBitunix),
    uniqueIndex("bitunix_users_email_key").on(table.email),
  ],
);

export const lockedSignals = mysqlTable(
  "locked_signals",
  {
    id: id(),
    userEmail: varchar("user_email", { length: 255 }).notNull(),
    uuidBitunix: varchar("uuid_bitunix", { length: 32 }),
    symbol: varchar("symbol", { length: 32 }).notNull(),
    base: varchar("base", { length: 32 }).notNull(),
    timeframe: varchar("timeframe", { length: 16 }).notNull(),
    bias: varchar("bias", { length: 16 }).notNull(),
    source: varchar("source", { length: 32 }),
    marketType: varchar("market_type", { length: 16 }).notNull().default("CEX"),
    entry: decimal("entry", { precision: 24, scale: 10 }).notNull(),
    currentPrice: decimal("current_price", { precision: 24, scale: 10 }).notNull(),
    sl: decimal("sl", { precision: 24, scale: 10 }),
    tp1: decimal("tp1", { precision: 24, scale: 10 }),
    tp2: decimal("tp2", { precision: 24, scale: 10 }),
    rsi: decimal("rsi", { precision: 10, scale: 4 }),
    emaFast: decimal("ema_fast", { precision: 24, scale: 10 }),
    emaSlow: decimal("ema_slow", { precision: 24, scale: 10 }),
    fastPeriod: int("fast_period"),
    slowPeriod: int("slow_period"),
    stochK: decimal("stoch_k", { precision: 10, scale: 4 }),
    stochD: decimal("stoch_d", { precision: 10, scale: 4 }),
    riskPercent: decimal("risk_percent", { precision: 10, scale: 4 }),
    rewardPercent: decimal("reward_percent", { precision: 10, scale: 4 }),
    riskReward: decimal("risk_reward", { precision: 10, scale: 4 }),
    sinceEntryPercent: decimal("since_entry_percent", { precision: 10, scale: 4 }),
    progressPercent: decimal("progress_percent", { precision: 10, scale: 4 }),
    status: varchar("status", { length: 16 }).notNull().default("ACTIVE"),
    hitAt: dateTime("hit_at"),
    lastCheckedAt: dateTime("last_checked_at"),
    createdAt: createdAt("created_at"),
    updatedAt: updatedAt("updated_at"),
  },
  (table) => [
    uniqueIndex("locked_signal_identity").on(
      table.userEmail,
      table.symbol,
      table.timeframe,
      table.status,
    ),
    index("locked_signals_user_email_status_idx").on(table.userEmail, table.status),
  ],
);

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: id(),
    email: varchar("email", { length: 255 }).notNull(),
    accountType: varchar("account_type", { length: 16 }).notNull(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: dateTime("expires_at").notNull(),
    usedAt: dateTime("used_at"),
    createdAt: createdAt("created_at"),
  },
  (table) => [
    uniqueIndex("password_reset_tokens_token_hash_key").on(table.tokenHash),
    index("password_reset_tokens_email_idx").on(table.email),
    index("password_reset_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  lockedSignals: many(lockedSignals),
  passwordResetTokens: many(passwordResetTokens),
}));

export const bitunixUsersRelations = relations(bitunixUsers, ({ many }) => ({
  lockedSignals: many(lockedSignals),
}));

export const lockedSignalsRelations = relations(lockedSignals, ({ one }) => ({
  user: one(users, {
    fields: [lockedSignals.userEmail],
    references: [users.email],
  }),
  bitunixUser: one(bitunixUsers, {
    fields: [lockedSignals.uuidBitunix],
    references: [bitunixUsers.uuidBitunix],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.email],
    references: [users.email],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type BitunixUser = typeof bitunixUsers.$inferSelect;
export type NewBitunixUser = typeof bitunixUsers.$inferInsert;
export type LockedSignal = typeof lockedSignals.$inferSelect;
export type NewLockedSignal = typeof lockedSignals.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
