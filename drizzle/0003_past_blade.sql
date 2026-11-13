CREATE TABLE `number_allocations` (
	`owner` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`sequence` integer NOT NULL,
	`reference` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `number_reference_unique` ON `number_allocations` (`reference`);--> statement-breakpoint
CREATE TABLE `number_counters` (
	`scope` text PRIMARY KEY NOT NULL,
	`value` integer NOT NULL
);
