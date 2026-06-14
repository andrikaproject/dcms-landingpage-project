CREATE TABLE `adaptive_gate_logs` (
	`id` varchar(191) NOT NULL,
	`snapshot_id` varchar(191) NOT NULL,
	`user_email` varchar(255),
	`engine_version` varchar(64) NOT NULL,
	`gate_version` varchar(64) NOT NULL,
	`mode` varchar(32) NOT NULL,
	`result` varchar(16) NOT NULL,
	`failed_gate` varchar(64),
	`reasons_json` text,
	`evidence_json` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `adaptive_gate_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signal_exposures` (
	`id` varchar(191) NOT NULL,
	`snapshot_id` varchar(191) NOT NULL,
	`user_email` varchar(255) NOT NULL,
	`uuid_bitunix` varchar(32),
	`action_type` varchar(32) NOT NULL,
	`ui_mode` varchar(16) NOT NULL DEFAULT 'UNKNOWN',
	`locked_signal_id` varchar(191),
	`seen_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `signal_exposures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signal_snapshots` (
	`id` varchar(191) NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`base` varchar(32) NOT NULL,
	`timeframe` varchar(16) NOT NULL,
	`source` varchar(32) NOT NULL,
	`market_type` varchar(16) NOT NULL DEFAULT 'CEX',
	`engine_version` varchar(64) NOT NULL,
	`candle_open_time` bigint unsigned NOT NULL,
	`candle_close_time` bigint unsigned NOT NULL,
	`bias` varchar(16) NOT NULL,
	`entry` decimal(36,18),
	`current_price_at_signal` decimal(36,18) NOT NULL,
	`sl` decimal(36,18),
	`tp1` decimal(36,18),
	`tp2` decimal(36,18),
	`rsi` decimal(18,8),
	`ema_fast` decimal(36,18),
	`ema_slow` decimal(36,18),
	`fast_period` int,
	`slow_period` int,
	`stoch_k` decimal(18,8),
	`stoch_d` decimal(18,8),
	`poc` decimal(36,18),
	`trendline` varchar(16),
	`support` decimal(36,18),
	`resistance` decimal(36,18),
	`key_mid` decimal(36,18),
	`atr` decimal(36,18),
	`risk_percent` decimal(18,8),
	`reward_percent` decimal(18,8),
	`risk_reward` decimal(18,8),
	`tp1_risk_reward` decimal(18,8),
	`feature_fingerprint` varchar(191),
	`outcome_status` varchar(16) NOT NULL DEFAULT 'OPEN',
	`outcome_resolved_at` datetime(3),
	`outcome_reason` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `signal_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `signal_snapshots_identity_key` UNIQUE(`symbol`,`timeframe`,`source`,`candle_close_time`,`engine_version`)
);
--> statement-breakpoint
CREATE INDEX `adaptive_gate_logs_snapshot_id_idx` ON `adaptive_gate_logs` (`snapshot_id`);--> statement-breakpoint
CREATE INDEX `adaptive_gate_logs_user_email_created_at_idx` ON `adaptive_gate_logs` (`user_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `signal_exposures_user_email_created_at_idx` ON `signal_exposures` (`user_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `signal_exposures_snapshot_id_idx` ON `signal_exposures` (`snapshot_id`);--> statement-breakpoint
CREATE INDEX `signal_exposures_locked_signal_id_idx` ON `signal_exposures` (`locked_signal_id`);--> statement-breakpoint
CREATE INDEX `signal_snapshots_symbol_timeframe_outcome_idx` ON `signal_snapshots` (`symbol`,`timeframe`,`outcome_status`);--> statement-breakpoint
CREATE INDEX `signal_snapshots_fingerprint_outcome_idx` ON `signal_snapshots` (`feature_fingerprint`,`outcome_status`);