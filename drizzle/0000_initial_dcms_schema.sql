CREATE TABLE `bitunix_users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid_bitunix` varchar(32) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(120),
	`password_hash` varchar(255) NOT NULL,
	`role` varchar(32) NOT NULL DEFAULT 'BITUNIX',
	`bitunix_status` varchar(32) NOT NULL DEFAULT 'VERIFIED',
	`bitunix_deposit_usdt` decimal(18,8),
	`last_trade_at` datetime(3),
	`bitunix_verified_at` datetime(3),
	`bitunix_last_checked_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `bitunix_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `bitunix_users_uuid_bitunix_key` UNIQUE(`uuid_bitunix`),
	CONSTRAINT `bitunix_users_email_key` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `locked_signals` (
	`id` varchar(191) NOT NULL,
	`user_email` varchar(255) NOT NULL,
	`uuid_bitunix` varchar(32),
	`symbol` varchar(32) NOT NULL,
	`base` varchar(32) NOT NULL,
	`timeframe` varchar(16) NOT NULL,
	`bias` varchar(16) NOT NULL,
	`source` varchar(32),
	`market_type` varchar(16) NOT NULL DEFAULT 'CEX',
	`entry` decimal(24,10) NOT NULL,
	`current_price` decimal(24,10) NOT NULL,
	`sl` decimal(24,10),
	`tp1` decimal(24,10),
	`tp2` decimal(24,10),
	`rsi` decimal(10,4),
	`ema_fast` decimal(24,10),
	`ema_slow` decimal(24,10),
	`fast_period` int,
	`slow_period` int,
	`stoch_k` decimal(10,4),
	`stoch_d` decimal(10,4),
	`risk_percent` decimal(10,4),
	`reward_percent` decimal(10,4),
	`risk_reward` decimal(10,4),
	`since_entry_percent` decimal(10,4),
	`progress_percent` decimal(10,4),
	`status` varchar(16) NOT NULL DEFAULT 'ACTIVE',
	`hit_at` datetime(3),
	`last_checked_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `locked_signals_id` PRIMARY KEY(`id`),
	CONSTRAINT `locked_signal_identity` UNIQUE(`user_email`,`symbol`,`timeframe`,`status`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(191) NOT NULL,
	`email` varchar(255) NOT NULL,
	`account_type` varchar(16) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_hash_key` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191),
	`email` varchar(191) NOT NULL,
	`password` varchar(191) NOT NULL,
	`role` enum('ADMIN','USER','BITUNIX') NOT NULL DEFAULT 'USER',
	`uuidBitunix` varchar(191),
	`statusReview` enum('NONE','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'NONE',
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `User_id` PRIMARY KEY(`id`),
	CONSTRAINT `User_email_key` UNIQUE(`email`),
	CONSTRAINT `User_uuidBitunix_key` UNIQUE(`uuidBitunix`)
);
--> statement-breakpoint
CREATE INDEX `locked_signals_user_email_status_idx` ON `locked_signals` (`user_email`,`status`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_email_idx` ON `password_reset_tokens` (`email`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_expires_at_idx` ON `password_reset_tokens` (`expires_at`);