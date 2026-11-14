CREATE TABLE `dossier_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` text NOT NULL,
	`operation` text NOT NULL,
	`note` text NOT NULL,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `inspection_dossiers`(`report_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dossier_files` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`metadata` text NOT NULL,
	`bytes` blob,
	`storage_key` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `inspection_dossiers`(`report_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inspection_dossiers` (
	`report_id` text PRIMARY KEY NOT NULL,
	`document` text NOT NULL,
	`version` integer NOT NULL,
	`mutation_id` text NOT NULL,
	`updated_at` text NOT NULL,
	`issued_file` text,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE restrict
);
