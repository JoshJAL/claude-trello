ALTER TABLE `user_settings` ADD `monthlyBudgetCents` integer;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `budgetAlertThreshold` integer DEFAULT 80;