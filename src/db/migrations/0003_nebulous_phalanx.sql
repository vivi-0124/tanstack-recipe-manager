CREATE TABLE `recipe_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`share_token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_shares_share_token_unique` ON `recipe_shares` (`share_token`);--> statement-breakpoint
CREATE INDEX `recipeShares_shareToken_idx` ON `recipe_shares` (`share_token`);--> statement-breakpoint
CREATE INDEX `recipeShares_recipeId_idx` ON `recipe_shares` (`recipe_id`);