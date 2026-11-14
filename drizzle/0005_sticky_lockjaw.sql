CREATE TABLE `report_links` (
	`slug` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`report_no` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `report_links_report_idx` ON `report_links` (`report_id`);