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
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const userRoles = ["ADMIN", "USER", "BITUNIX"] as const;
export const approvalStatuses = ["NONE", "PENDING", "APPROVED", "REJECTED"] as const;
export const signalOutcomeStatuses = ["OPEN", "WIN", "LOSS", "LOSS_SOFT", "AMBIGUOUS"] as const;
export const signalExposureActionTypes = ["SEARCH", "REANALYZE", "DASHBOARD_VIEW", "LOCK"] as const;
export const signalUiModes = ["STANDARD", "CONSERVATIVE", "UNKNOWN"] as const;
export const adaptiveGateResults = ["LONG_VALID", "SHORT_VALID", "NOT_READY"] as const;

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

export const signalSnapshots = mysqlTable(
  "signal_snapshots",
  {
    id: id(),
    symbol: varchar("symbol", { length: 32 }).notNull(),
    base: varchar("base", { length: 32 }).notNull(),
    timeframe: varchar("timeframe", { length: 16 }).notNull(),
    source: varchar("source", { length: 32 }).notNull(),
    marketType: varchar("market_type", { length: 16 }).notNull().default("CEX"),
    engineVersion: varchar("engine_version", { length: 64 }).notNull(),
    candleOpenTime: bigint("candle_open_time", { mode: "number", unsigned: true }).notNull(),
    candleCloseTime: bigint("candle_close_time", { mode: "number", unsigned: true }).notNull(),
    bias: varchar("bias", { length: 16 }).notNull(),
    entry: decimal("entry", { precision: 36, scale: 18 }),
    currentPriceAtSignal: decimal("current_price_at_signal", { precision: 36, scale: 18 }).notNull(),
    sl: decimal("sl", { precision: 36, scale: 18 }),
    tp1: decimal("tp1", { precision: 36, scale: 18 }),
    tp2: decimal("tp2", { precision: 36, scale: 18 }),
    rsi: decimal("rsi", { precision: 18, scale: 8 }),
    emaFast: decimal("ema_fast", { precision: 36, scale: 18 }),
    emaSlow: decimal("ema_slow", { precision: 36, scale: 18 }),
    fastPeriod: int("fast_period"),
    slowPeriod: int("slow_period"),
    stochK: decimal("stoch_k", { precision: 18, scale: 8 }),
    stochD: decimal("stoch_d", { precision: 18, scale: 8 }),
    poc: decimal("poc", { precision: 36, scale: 18 }),
    trendline: varchar("trendline", { length: 16 }),
    support: decimal("support", { precision: 36, scale: 18 }),
    resistance: decimal("resistance", { precision: 36, scale: 18 }),
    keyMid: decimal("key_mid", { precision: 36, scale: 18 }),
    atr: decimal("atr", { precision: 36, scale: 18 }),
    riskPercent: decimal("risk_percent", { precision: 18, scale: 8 }),
    rewardPercent: decimal("reward_percent", { precision: 18, scale: 8 }),
    riskReward: decimal("risk_reward", { precision: 18, scale: 8 }),
    tp1RiskReward: decimal("tp1_risk_reward", { precision: 18, scale: 8 }),
    featureFingerprint: varchar("feature_fingerprint", { length: 191 }),
    outcomeStatus: varchar("outcome_status", { length: 16 }).notNull().default("OPEN"),
    outcomeResolvedAt: dateTime("outcome_resolved_at"),
    outcomeReason: varchar("outcome_reason", { length: 255 }),
    createdAt: createdAt("created_at"),
    updatedAt: updatedAt("updated_at"),
  },
  (table) => [
    uniqueIndex("signal_snapshots_identity_key").on(
      table.symbol,
      table.timeframe,
      table.source,
      table.candleCloseTime,
      table.engineVersion,
    ),
    index("signal_snapshots_symbol_timeframe_outcome_idx").on(
      table.symbol,
      table.timeframe,
      table.outcomeStatus,
    ),
    index("signal_snapshots_fingerprint_outcome_idx").on(
      table.featureFingerprint,
      table.outcomeStatus,
    ),
  ],
);

export const signalExposures = mysqlTable(
  "signal_exposures",
  {
    id: id(),
    snapshotId: varchar("snapshot_id", { length: 191 }).notNull(),
    userEmail: varchar("user_email", { length: 255 }).notNull(),
    uuidBitunix: varchar("uuid_bitunix", { length: 32 }),
    actionType: varchar("action_type", { length: 32 }).notNull(),
    uiMode: varchar("ui_mode", { length: 16 }).notNull().default("UNKNOWN"),
    lockedSignalId: varchar("locked_signal_id", { length: 191 }),
    seenAt: dateTime("seen_at").notNull().default(sql`CURRENT_TIMESTAMP(3)`),
    createdAt: createdAt("created_at"),
  },
  (table) => [
    index("signal_exposures_user_email_created_at_idx").on(table.userEmail, table.createdAt),
    index("signal_exposures_snapshot_id_idx").on(table.snapshotId),
    index("signal_exposures_locked_signal_id_idx").on(table.lockedSignalId),
  ],
);

export const adaptiveGateLogs = mysqlTable(
  "adaptive_gate_logs",
  {
    id: id(),
    snapshotId: varchar("snapshot_id", { length: 191 }).notNull(),
    userEmail: varchar("user_email", { length: 255 }),
    engineVersion: varchar("engine_version", { length: 64 }).notNull(),
    gateVersion: varchar("gate_version", { length: 64 }).notNull(),
    mode: varchar("mode", { length: 32 }).notNull(),
    result: varchar("result", { length: 16 }).notNull(),
    failedGate: varchar("failed_gate", { length: 64 }),
    reasonsJson: text("reasons_json"),
    evidenceJson: text("evidence_json"),
    createdAt: createdAt("created_at"),
  },
  (table) => [
    index("adaptive_gate_logs_snapshot_id_idx").on(table.snapshotId),
    index("adaptive_gate_logs_user_email_created_at_idx").on(table.userEmail, table.createdAt),
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
  signalExposures: many(signalExposures),
  adaptiveGateLogs: many(adaptiveGateLogs),
}));

export const bitunixUsersRelations = relations(bitunixUsers, ({ many }) => ({
  lockedSignals: many(lockedSignals),
  signalExposures: many(signalExposures),
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

export const signalSnapshotsRelations = relations(signalSnapshots, ({ many }) => ({
  exposures: many(signalExposures),
  gateLogs: many(adaptiveGateLogs),
}));

export const signalExposuresRelations = relations(signalExposures, ({ one }) => ({
  snapshot: one(signalSnapshots, {
    fields: [signalExposures.snapshotId],
    references: [signalSnapshots.id],
  }),
  user: one(users, {
    fields: [signalExposures.userEmail],
    references: [users.email],
  }),
  bitunixUser: one(bitunixUsers, {
    fields: [signalExposures.uuidBitunix],
    references: [bitunixUsers.uuidBitunix],
  }),
  lockedSignal: one(lockedSignals, {
    fields: [signalExposures.lockedSignalId],
    references: [lockedSignals.id],
  }),
}));

export const adaptiveGateLogsRelations = relations(adaptiveGateLogs, ({ one }) => ({
  snapshot: one(signalSnapshots, {
    fields: [adaptiveGateLogs.snapshotId],
    references: [signalSnapshots.id],
  }),
  user: one(users, {
    fields: [adaptiveGateLogs.userEmail],
    references: [users.email],
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
export type SignalSnapshot = typeof signalSnapshots.$inferSelect;
export type NewSignalSnapshot = typeof signalSnapshots.$inferInsert;
export type SignalExposure = typeof signalExposures.$inferSelect;
export type NewSignalExposure = typeof signalExposures.$inferInsert;
export type AdaptiveGateLog = typeof adaptiveGateLogs.$inferSelect;
export type NewAdaptiveGateLog = typeof adaptiveGateLogs.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
