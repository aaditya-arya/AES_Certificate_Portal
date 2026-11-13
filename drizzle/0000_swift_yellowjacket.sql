CREATE TABLE `media_blobs` (
	`digest` text PRIMARY KEY NOT NULL,
	`mime` text NOT NULL,
	`bytes` blob NOT NULL
);
--> statement-breakpoint
CREATE TABLE `report_changes` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` text NOT NULL,
	`version` integer NOT NULL,
	`operation` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `report_media` (
	`report_id` text NOT NULL,
	`media_id` text NOT NULL,
	`mime` text NOT NULL,
	`storage_key` text,
	`digest` text NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_report_idx` ON `report_media` (`report_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`document` text NOT NULL,
	`version` integer NOT NULL,
	`mutation_id` text NOT NULL,
	`workflow` text NOT NULL,
	`report_no` text NOT NULL,
	`client` text NOT NULL,
	`project` text NOT NULL,
	`inspection_date` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_updated_idx` ON `reports` (`updated_at`);--> statement-breakpoint
CREATE INDEX `reports_workflow_idx` ON `reports` (`workflow`);