PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pirep_events` (
	`id` text PRIMARY KEY NOT NULL,
	`pirep_id` text NOT NULL,
	`action` text NOT NULL,
	`performed_by` text,
	`details` text,
	`previous_values` text,
	`new_values` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`pirep_id`) REFERENCES `pireps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_pirep_events`("id", "pirep_id", "action", "performed_by", "details", "previous_values", "new_values", "created_at") SELECT "id", "pirep_id", "action", "performed_by", "details", "previous_values", "new_values", "created_at" FROM `pirep_events`;--> statement-breakpoint
DROP TABLE `pirep_events`;--> statement-breakpoint
ALTER TABLE `__new_pirep_events` RENAME TO `pirep_events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `pirep_events_pirep_id_index` ON `pirep_events` (`pirep_id`);--> statement-breakpoint
CREATE INDEX `pirep_events_action_index` ON `pirep_events` (`action`);--> statement-breakpoint
CREATE INDEX `pirep_events_performed_by_index` ON `pirep_events` (`performed_by`);--> statement-breakpoint
CREATE INDEX `pirep_events_created_at_index` ON `pirep_events` (`created_at`);--> statement-breakpoint
ALTER TABLE `airline` ADD `auto_approval_mode` text DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE `airline` ADD `auto_approval_tolerance` integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `airline` ADD `auto_approval_min_pireps` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `pireps` ADD `auto_approved` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `pireps` ADD `verification_results` text;--> statement-breakpoint
ALTER TABLE `pireps` ADD `verified_at` integer;