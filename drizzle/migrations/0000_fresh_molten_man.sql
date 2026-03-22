CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`idToken` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `agent_session` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`source` text NOT NULL,
	`sourceIdentifier` text NOT NULL,
	`sourceName` text NOT NULL,
	`providerId` text NOT NULL,
	`mode` text NOT NULL,
	`maxConcurrency` integer,
	`initialMessage` text,
	`status` text NOT NULL,
	`errorMessage` text,
	`inputTokens` integer DEFAULT 0 NOT NULL,
	`outputTokens` integer DEFAULT 0 NOT NULL,
	`totalCostCents` integer DEFAULT 0 NOT NULL,
	`tasksTotal` integer DEFAULT 0 NOT NULL,
	`tasksCompleted` integer DEFAULT 0 NOT NULL,
	`startedAt` integer NOT NULL,
	`completedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `provider_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`providerId` text NOT NULL,
	`encryptedApiKey` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_keys_user_provider_idx` ON `provider_keys` (`userId`,`providerId`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`token` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `session_event` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`type` text NOT NULL,
	`agentIndex` integer,
	`cardId` text,
	`content` text NOT NULL,
	`sequence` integer NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`sessionId`) REFERENCES `agent_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`userId` text PRIMARY KEY NOT NULL,
	`encryptedAnthropicApiKey` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
