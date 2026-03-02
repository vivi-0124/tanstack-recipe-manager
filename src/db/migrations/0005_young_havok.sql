CREATE TABLE `user_units` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `userUnits_userId_idx` ON `user_units` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `userUnits_userId_name_unique` ON `user_units` (`user_id`,`name`);