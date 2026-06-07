CREATE TABLE `lick_tags` (
	`lick_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`lick_id`, `tag_id`),
	FOREIGN KEY (`lick_id`) REFERENCES `licks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `licks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`tuning` text NOT NULL,
	`tab` text NOT NULL,
	`memo` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);