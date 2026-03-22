CREATE TABLE `registered_webhook` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`source` text NOT NULL,
	`sourceIdentifier` text NOT NULL,
	`webhookId` text,
	`secret` text,
	`active` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
