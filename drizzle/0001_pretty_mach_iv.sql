CREATE TABLE `document_events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` text NOT NULL,
	`type` text NOT NULL,
	`version` integer NOT NULL,
	`operation` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `document_files` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`digest` text NOT NULL,
	`bytes` blob,
	`storage_key` text,
	FOREIGN KEY (`document_id`) REFERENCES `inspection_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `document_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` text NOT NULL,
	`version` integer NOT NULL,
	`document` text NOT NULL,
	`context` text NOT NULL,
	`operation` text NOT NULL,
	`note` text NOT NULL,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `inspection_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inspection_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`type` text NOT NULL,
	`number` text NOT NULL,
	`revision` text NOT NULL,
	`status` text NOT NULL,
	`document` text NOT NULL,
	`context` text NOT NULL,
	`version` integer NOT NULL,
	`mutation_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `documents_report_idx` ON `inspection_documents` (`report_id`);--> statement-breakpoint
CREATE INDEX `documents_type_status_idx` ON `inspection_documents` (`type`,`status`);